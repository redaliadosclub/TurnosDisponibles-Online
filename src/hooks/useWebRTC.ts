import { useState, useEffect, useRef, useCallback } from 'react';

export interface ChatMessage {
  id: string;
  sender: string;
  role: 'doctor' | 'patient';
  text: string;
  timestamp: string;
}

export interface UseWebRTCOptions {
  room: string;
  role: 'doctor' | 'patient';
  userName: string;
  onPrescriptionReceived?: (prescription: any) => void;
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export function useWebRTC({
  room,
  role,
  userName,
  onPrescriptionReceived,
}: UseWebRTCOptions) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    'initializing' | 'waiting_peer' | 'connecting' | 'connected' | 'disconnected' | 'error'
  >('initializing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  const [remotePeerName, setRemotePeerName] = useState<string | null>(null);
  const [remotePeerRole, setRemotePeerRole] = useState<'doctor' | 'patient' | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const peerIdRef = useRef<string>(`peer_${Math.random().toString(36).substring(2, 9)}`);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const targetPeerIdRef = useRef<string | null>(null);
  const isInitiatorRef = useRef(false);

  // Initialize Media Devices
  const startMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (err: any) {
      console.warn('[WebRTC UserMedia Warning]:', err);
      // Fallback to audio only if camera is unavailable or denied
      try {
        const audioOnlyStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = audioOnlyStream;
        setLocalStream(audioOnlyStream);
        setIsVideoOff(true);
        return audioOnlyStream;
      } catch (audioErr: any) {
        setErrorMessage('No se pudo acceder a la cámara ni al micrófono. Por favor verifica los permisos.');
        setConnectionStatus('error');
        return null;
      }
    }
  }, [facingMode]);

  // Create Peer Connection
  const createPeerConnection = useCallback((targetPeerId: string, stream: MediaStream) => {
    if (pcRef.current) {
      pcRef.current.close();
    }

    const pc = new RTCPeerConnection(RTC_CONFIG);
    pcRef.current = pc;
    targetPeerIdRef.current = targetPeerId;

    // Add local tracks to connection
    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    // Handle remote tracks
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
        setConnectionStatus('connected');
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'ice-candidate',
            room,
            targetPeerId,
            candidate: event.candidate,
          })
        );
      }
    };

    pc.onconnectionstatechange = () => {
      if (!pc) return;
      switch (pc.connectionState) {
        case 'connected':
          setConnectionStatus('connected');
          break;
        case 'connecting':
          setConnectionStatus('connecting');
          break;
        case 'disconnected':
        case 'failed':
          setConnectionStatus('waiting_peer');
          break;
        case 'closed':
          setConnectionStatus('disconnected');
          break;
      }
    };

    return pc;
  }, [room]);

  // Signaling Setup
  useEffect(() => {
    let isCancelled = false;

    const setupCall = async () => {
      const stream = await startMedia();
      if (!stream || isCancelled) return;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/signaling`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectionStatus('waiting_peer');
        ws.send(
          JSON.stringify({
            type: 'join',
            room,
            peerId: peerIdRef.current,
            role,
            name: userName,
          })
        );
      };

      ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data);

          switch (msg.type) {
            case 'existing-peers': {
              if (msg.peers && msg.peers.length > 0) {
                const peer = msg.peers[0];
                targetPeerIdRef.current = peer.peerId;
                setRemotePeerName(peer.name);
                setRemotePeerRole(peer.role);
                isInitiatorRef.current = true;

                // Create connection and send offer
                const pc = createPeerConnection(peer.peerId, stream);
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);

                ws.send(
                  JSON.stringify({
                    type: 'offer',
                    room,
                    targetPeerId: peer.peerId,
                    offer,
                  })
                );
              }
              break;
            }

            case 'peer-joined': {
              targetPeerIdRef.current = msg.peerId;
              setRemotePeerName(msg.name);
              setRemotePeerRole(msg.role);
              setConnectionStatus('connecting');
              break;
            }

            case 'offer': {
              targetPeerIdRef.current = msg.fromPeerId;
              setRemotePeerName(msg.fromName || 'Participante');
              setRemotePeerRole(msg.fromRole || (role === 'doctor' ? 'patient' : 'doctor'));
              setConnectionStatus('connecting');

              const pc = createPeerConnection(msg.fromPeerId, stream);
              await pc.setRemoteDescription(new RTCSessionDescription(msg.offer));
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);

              ws.send(
                JSON.stringify({
                  type: 'answer',
                  room,
                  targetPeerId: msg.fromPeerId,
                  answer,
                })
              );
              break;
            }

            case 'answer': {
              if (pcRef.current) {
                await pcRef.current.setRemoteDescription(new RTCSessionDescription(msg.answer));
              }
              break;
            }

            case 'ice-candidate': {
              if (pcRef.current && msg.candidate) {
                try {
                  await pcRef.current.addIceCandidate(new RTCIceCandidate(msg.candidate));
                } catch (e) {
                  console.warn('[WebRTC Candidate Add Error]:', e);
                }
              }
              break;
            }

            case 'peer-left': {
              setRemoteStream(null);
              setConnectionStatus('waiting_peer');
              if (pcRef.current) {
                pcRef.current.close();
                pcRef.current = null;
              }
              break;
            }

            case 'chat-message': {
              if (msg.message) {
                setChatMessages((prev) => [...prev, msg.message]);
              }
              break;
            }

            case 'prescription-issued': {
              if (msg.prescription && onPrescriptionReceived) {
                onPrescriptionReceived(msg.prescription);
              }
              break;
            }
          }
        } catch (err) {
          console.error('[WebRTC Message Handle Error]:', err);
        }
      };

      ws.onerror = () => {
        setConnectionStatus('error');
        setErrorMessage('Error al conectar con el servidor de señalización WebRTC.');
      };

      ws.onclose = () => {
        if (!isCancelled) {
          setConnectionStatus('disconnected');
        }
      };
    };

    setupCall();

    return () => {
      isCancelled = true;
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (pcRef.current) {
        pcRef.current.close();
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [room, role, userName, createPeerConnection, startMedia, onPrescriptionReceived]);

  // Controls: Audio
  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioMuted(!audioTrack.enabled);
      }
    }
  }, []);

  // Controls: Video
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  }, []);

  // Controls: Flip camera for mobile
  const flipCamera = useCallback(async () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: nextMode },
        audio: true,
      });

      const newVideoTrack = newStream.getVideoTracks()[0];
      if (pcRef.current && newVideoTrack) {
        const sender = pcRef.current.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(newVideoTrack);
        }
      }

      if (localStreamRef.current) {
        const oldTrack = localStreamRef.current.getVideoTracks()[0];
        if (oldTrack) oldTrack.stop();
        localStreamRef.current.removeTrack(oldTrack);
        localStreamRef.current.addTrack(newVideoTrack);
      }
      setLocalStream(newStream);
    } catch (e) {
      console.warn('[Camera Flip Error]:', e);
    }
  }, [facingMode]);

  // Controls: Screen Share
  const toggleScreenShare = useCallback(async () => {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        const screenTrack = screenStream.getVideoTracks()[0];

        if (pcRef.current) {
          const sender = pcRef.current.getSenders().find((s) => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(screenTrack);
          }
        }

        screenTrack.onended = () => {
          // Revert back to camera when user stops screen share
          if (localStreamRef.current) {
            const camTrack = localStreamRef.current.getVideoTracks()[0];
            if (pcRef.current && camTrack) {
              const sender = pcRef.current.getSenders().find((s) => s.track?.kind === 'video');
              if (sender) sender.replaceTrack(camTrack);
            }
          }
          setIsScreenSharing(false);
        };

        setIsScreenSharing(true);
      } catch (err) {
        console.warn('[Screen Share Cancelled / Error]:', err);
      }
    } else {
      if (localStreamRef.current) {
        const camTrack = localStreamRef.current.getVideoTracks()[0];
        if (pcRef.current && camTrack) {
          const sender = pcRef.current.getSenders().find((s) => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(camTrack);
        }
      }
      setIsScreenSharing(false);
    }
  }, [isScreenSharing]);

  // Controls: Send in-call chat message
  const sendChatMessage = useCallback(
    (text: string) => {
      if (!text.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

      const message: ChatMessage = {
        id: `msg_${Date.now()}`,
        sender: userName,
        role,
        text: text.trim(),
        timestamp: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      };

      wsRef.current.send(
        JSON.stringify({
          type: 'chat-message',
          room,
          message,
        })
      );
    },
    [room, userName, role]
  );

  // Broadcast prescription to patient in call
  const broadcastPrescription = useCallback(
    (prescription: any) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
      wsRef.current.send(
        JSON.stringify({
          type: 'prescription-issued',
          room,
          prescription,
        })
      );
    },
    [room]
  );

  // End call
  const endCall = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    setConnectionStatus('disconnected');
  }, []);

  return {
    localStream,
    remoteStream,
    connectionStatus,
    errorMessage,
    isAudioMuted,
    isVideoOff,
    isScreenSharing,
    remotePeerName,
    remotePeerRole,
    chatMessages,
    toggleAudio,
    toggleVideo,
    flipCamera,
    toggleScreenShare,
    sendChatMessage,
    broadcastPrescription,
    endCall,
  };
}
