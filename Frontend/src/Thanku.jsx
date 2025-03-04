import React from 'react'
import { useLocation, useNavigate } from "react-router-dom";

function Thanku() {
  const location = useLocation();
  const formData = location.state?.Data || {};
  const pdfFileId = location.state?.pdfFileId || "";

  console.log("Form Data:", formData);
  console.log("PDF URL:", pdfFileId);      

  const navigate = useNavigate();

  // Redirect back to form on page refresh
  React.useEffect(() => {
    const redirectToForm = () => {
      navigate("/");
    };

    const timeout = setTimeout(() => {              
      redirectToForm();
    }, 300000); // Redirect after 5 minutes (optional)

    return () => clearTimeout(timeout);
  }, [navigate]);

  const downloadPDF = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await fetch(`${apiUrl}/pdf/api/download-pdf?fileId=${pdfFileId}`);
      
      if (!response.ok) {
        throw new Error('Failed to download PDF');
      }
  
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'settlement_form.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (error) {
      console.error('Error:', error);
    }
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F3FEB8] px-3 py-5 ">
    <div className="bg-transparent border bg-yellow-400 p-4 md:p-8 rounded-lg shadow-xl w-[800px]">
      <h2 className="text-2xl font-bold text-center text-[#FF4C4C] mb-4">
        Thank You for Your Submission!
      </h2>
      <p className="text-center mb-6">We have received your settlement form.</p>

      {/* Download button */}
      {pdfFileId  && (
          <div className="text-center mt-4">
            <button
              onClick={downloadPDF}
              className="inline-block bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600"
            >
              Download PDF
            </button>
          </div>
        )}
    </div>
  </div>
  )
}

export default Thanku