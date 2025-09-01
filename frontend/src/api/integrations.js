// frontend/src/api/integrations.js

// Platzhalter-Implementierungen für lokale Entwicklung
export const Core = {};

// ==================== InvokeLLM ====================
Core.InvokeLLM = async (prompt, options = {}) => {
  // Dummy-Lösung: gibt einfach prompt zurück
  return { response: `LLM output for: ${prompt}` };
};

// ==================== SendEmail ====================
Core.SendEmail = async ({ to, subject, body }) => {
  console.log(`Pretend sending email to ${to}: ${subject}\n${body}`);
  return { status: "ok", message: "Email sent (mock)" };
};

// ==================== UploadFile ====================
Core.UploadFile = async (file) => {
  console.log("Pretend uploading file:", file.name || file);
  return { url: `/mock/uploads/${file.name || "file.txt"}` };
};

// ==================== GenerateImage ====================
Core.GenerateImage = async (prompt, options = {}) => {
  console.log("Pretend generating image for prompt:", prompt);
  return { url: "/mock/generated_image.png" };
};

// ==================== ExtractDataFromUploadedFile ====================
Core.ExtractDataFromUploadedFile = async (file) => {
  console.log("Pretend extracting data from file:", file.name || file);
  return { data: "Mock extracted data" };
};

// Exportiere InvokeLLM etc. direkt
export const InvokeLLM = Core.InvokeLLM;
export const SendEmail = Core.SendEmail;
export const UploadFile = Core.UploadFile;
export const GenerateImage = Core.GenerateImage;
export const ExtractDataFromUploadedFile = Core.ExtractDataFromUploadedFile;
