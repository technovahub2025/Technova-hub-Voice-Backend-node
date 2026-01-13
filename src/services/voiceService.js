import axios from "axios";

// OUTBOUND CALL
export const initiateOutboundCall = async (phone, scenario) => {
  // This is a placeholder (Retell/Vapi will go here)
  console.log("Calling:", phone, "Scenario:", scenario);

  return {
    callId: Date.now(),
    status: "initiated",
  };
};

// INBOUND CALL
export const handleInboundCall = async (payload) => {
  console.log("Inbound Call Payload:", payload);

  // Example AI greeting
  return {
    response: "Hello! Thank you for calling Technovo Hub. How can I help you?",
  };
};
