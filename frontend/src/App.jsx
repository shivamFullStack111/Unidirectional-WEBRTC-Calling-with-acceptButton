import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import { BrowserRouter, Route, Routes } from "react-router-dom";

const socket = io("http://192.168.169.216:7000");

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/receiver" element={<Receive />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;

const Home = () => {
  const myAudioRef = useRef(null); // For displaying caller's video
  const peerAudioRef = useRef(null); // For displaying receiver's video
  const peerConnection = useRef(new RTCPeerConnection());
  const [activeUsers, setActiveUsers] = useState([]);
  const [me, setMe] = useState("");

  useEffect(() => {
    if (!socket) return;

    socket.on("activeUsers", (users) => setActiveUsers(users));
    socket.on("me", (socketId) => setMe(socketId));
    socket.on("callAccepted", ({ answer }) => {
      console.log("call accepted");
      peerConnection.current.setRemoteDescription(
        new RTCSessionDescription(answer)
      );
    });

    return () => {
      socket.off("me");
      socket.off("activeUsers");
      socket.off("callAccepted");
    };
  }, []);

  const handleCall = async (userId) => {
    try {
      peerConnection.current.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("candidate", { candidate: event.candidate, to: userId });
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      // here set candidate
      // if (myAudioRef.current)
      // myAudioRef.current.srcObject = stream;

      stream
        .getTracks()
        .forEach((track) => peerConnection.current.addTrack(track, stream));

      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);

      socket.emit("call", { offer, to: userId });
    } catch (error) {
      console.error("Error accessing media devices:", error);
    }
  };

  return (
    <div>
      <div>
        {/* <audio
          ref={myAudioRef}
          autoPlay
          controls
          muted
          style={{ width: "300px", border: "1px solid black" }}
        /> */}
        oponent audio =>{"           "}
        <audio
          ref={peerAudioRef}
          autoPlay
          controls
          style={{ width: "300px" }}
        />
      </div>
      <p>
        {activeUsers?.map((socketId) => (
          <div onClick={() => handleCall(socketId)} key={socketId}>
            Call {socketId}
          </div>
        ))}
      </p>
    </div>
  );
};

const Receive = () => {
  const myVideoRef = useRef(null); // For displaying receiver's video
  const peerVideoRef = useRef(null); // For displaying caller's video
  const peerConnection = useRef(new RTCPeerConnection());
  const [isCallIncoming, setIsCallIncoming] = useState(false);
  const [offer, setOffer] = useState(null);
  const pendingCandidates = useRef([]);
  const [from, setfrom] = useState(null);

  useEffect(() => {
    if (!socket) return;

    peerConnection.current.ontrack = (event) => {
      console.log("Received remote stream:", event.streams[0]);
      peerVideoRef.current.srcObject = event.streams[0];
    };

    socket.on("incomingCall", async ({ offer, from }) => {
      console.log("offer while calling", offer);
      setIsCallIncoming(true);
      setfrom(from);
      setOffer(offer);
      peerConnection.current.onicecandidate = (event) => {
        if (event.candidate) {
          console.log("Sending ICE candidate:", event.candidate);
          socket.emit("candidate", { candidate: event.candidate, to: from });
        }
      };

      await peerConnection.current.setRemoteDescription(
        new RTCSessionDescription(offer)
      );
    });

    socket.on("candidate", async (candidate) => {
      try {
        await peerConnection.current.addIceCandidate(
          new RTCIceCandidate(candidate)
        );
      } catch (error) {
        console.error("Error adding received ICE candidate-----:", error);
      }
    });

    return () => {
      socket.off("incomingCall");
      socket.off("candidate");
    };
  }, []);

  const handleAccept = async () => {
    // try {
    //   const stream = await navigator.mediaDevices.getUserMedia({
    //     video: true,
    //     audio: true,
    //   });
    //   if (myVideoRef.current) myVideoRef.current.srcObject = stream;

    //   stream
    //     .getTracks()
    //     .forEach((track) => peerConnection.current.addTrack(track, stream));

    //   await peerConnection.current.setRemoteDescription(
    //     new RTCSessionDescription(offer)
    //   );

    //   pendingCandidates.current.forEach((candidate) => {
    //     peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
    //   });
    //   pendingCandidates.current = [];

    //   const answer = await peerConnection.current.createAnswer();
    //   await peerConnection.current.setLocalDescription(answer);

    //   socket.emit("answer", { answer, to: offer.from });

    //   peerConnection.current.onicecandidate = (event) => {
    //     if (event.candidate) {
    //       socket.emit("candidate", {
    //         candidate: event.candidate,
    //         to: offer.from,
    //       });
    //     }
    //   };

    //   peerConnection.current.ontrack = (event) => {
    //     const [remoteStream] = event.streams;
    //     if (peerVideoRef.current) peerVideoRef.current.srcObject = remoteStream;
    //   };

    //   setIsCallIncoming(false);
    // } catch (error) {
    //   console.error("Error accepting call:", error);
    // }
    console.log("Received offer:", offer);
    try {
      peerConnection.current.onicecandidate = (event) => {
        if (event.candidate) {
          console.log("Sending ICE candidate:", event.candidate);
          socket.emit("candidate", { candidate: event.candidate, to: from });
        }
      };

      // await peerConnection.current.setRemoteDescription(
      //   new RTCSessionDescription(offer)
      // );

      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);
      console.log("from", from);
      socket.emit("answer", { answer, to: from });
      console.log("Sent answer:", answer);
    } catch (error) {
      console.error(
        "Error setting remote description or creating answer:",
        error
      );
    }
  };

  return (
    <div>
      <div>
        {/* <audio
          ref={myVideoRef}
          autoPlay
          controls
          muted
          style={{ width: "300px", border: "1px solid black" }}
        /> */}
        <audio
          ref={peerVideoRef}
          autoPlay
          controls
          style={{ width: "300px", border: "1px solid black" }}
        />
      </div>
      {isCallIncoming && <button onClick={handleAccept}>Accept Call</button>}
    </div>
  );
};
