import SettelmentData from "../model/settelmen.model.js";
import multer from "multer";
import { google } from "googleapis";
import { Readable } from "stream";
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

// Authenticate with Google APIsfrontend
const { google } = require('google-auth-library');

const authenticateGoogle = async () => {
  try {
    const googleCredentials = process.env.GOOGLE_CREDENTIALS;
    console.log("GOOGLE_CREDENTIALS:", googleCredentials); // Debugging line

    if (!googleCredentials) {
      throw new Error("Google credentials environment variable is not set.");
    }

    const credentials = JSON.parse(googleCredentials); // Parse the JSON string
    console.log("Parsed Credentials:", credentials); // Debugging line

    const auth = google.auth.fromJSON(credentials); // Use fromJSON instead of credentials
    auth.scopes = [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive",
    ];

    return auth;
  } catch (error) {
    console.error('Error authenticating with Google:', error);
    throw new Error('Google authentication failed');
  }
};


// Endpoint to download the generated PDF
export const downloadPDF = async (req, res) => {
  const { fileId } = req.query;

  // Validate file ID
  if (!fileId) {
    return res.status(400).json({ message: 'No file ID provided' });
  }

  try {
    const auth = await authenticateGoogle();
    const drive = google.drive({ version: 'v3', auth });

    // Get the file metadata
    const fileMetadata = await drive.files.get({
      fileId,
      fields: 'name',
    });
    
    // Stream the file from Google Drive
    const fileStream = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' }
    );

    // Set response headers for download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileMetadata.data.name}"`);

    // Pipe the file stream to the response
    fileStream.data.pipe(res);
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ message: 'Error downloading file' });
  }
};


// Function to generate PDF
const generatePDF = async (data, auth, projectName, personName, parentFolderId) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const fileName = `./pdfs/${data.name}_settlement_${Date.now()}.pdf`;

    // Create directory if not exists
    if (!fs.existsSync('./pdfs')) {
      fs.mkdirSync('./pdfs');
    }

    const writeStream = fs.createWriteStream(fileName);
    doc.pipe(writeStream);

    // Add Logo (Image)
    doc.image('./media/yuvalogo.png', 50, 50, { width: 80 }); // Adjust path and dimensions
    doc.moveDown();

    // Add Header
    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .fillColor('#FF4C4C') // Red color for header
      .text('YOUTH FOR UNITY AND VOLUNTARY ACTION', 130, 80, { align: 'center' }) // Centered at x=130, y=80
      .fontSize(12)
      .fillColor('#000000') // Black color for address
      .text('Yuva Centre, Plot No. 23, Sector 7, Kharghar, Navi Mumbai - 4102010', 120, 100, { align: 'center' }) // Centered at x=120, y=100
      .moveDown();


    // Add Title
    doc
      .fontSize(18)
      .font('Helvetica-Bold')
      .fillColor('#000080') // Navy blue color for title
      .text('EXPENDITURE SETTLEMENT SHEET', 50, 150, { align: 'center', underline: true }) // Centered at x=50, y=150
      .moveDown();

    // Add Person Name and Advance Settlement Date
    const startY = 190; // Starting Y position for details
    doc
      .fontSize(12)
      .fillColor('#000000') // Black color for text
      .font('Helvetica-Bold') // Set bold font for labels
      .text('Person Name:', 50, startY) // Label in bold
      .font('Helvetica') // Switch back to regular font for the answer
      .text(`${data.name}`, 150, startY) // Answer in regular font
      .font('Helvetica-Bold') // Set bold font for the next label
      .text('Advance Settlement Date:', 280, startY) // Label in bold
      .font('Helvetica') // Switch back to regular font for the answer
      .text(`${data.advSetlDate}`, 450, startY) // Answer in regular font
      .moveDown();

    // Add Region / City / Area and Project
    doc
      .fontSize(12)
      .fillColor('#000000') // Black color for text
      .font('Helvetica-Bold') // Set bold font for labels
      .text('Region / City / Area:', 50, startY + 30) // Label in bold
      .font('Helvetica') // Switch back to regular font for the answer
      .text(`${data.area}`, 180, startY + 30) // Answer in regular font
      .font('Helvetica-Bold') // Set bold font for the next label
      .text('Project:', 280, startY + 30) // Label in bold
      .font('Helvetica') // Switch back to regular font for the answer
      .text(`${data.project}`, 350, startY + 30) // Answer in regular font
      .moveDown();

    // Add Place Of Program and Project Code
    doc
      .fontSize(12)
      .fillColor('#000000') // Black color for text
      .font('Helvetica-Bold') // Set bold font for labels
      .text('Place Of Program:', 50, startY + 60) // Label in bold
      .font('Helvetica') // Switch back to regular font for the answer
      .text(`${data.placeProg}`, 180, startY + 60) // Answer in regular font
      .font('Helvetica-Bold') // Set bold font for the next label
      .text('Project Code:', 280, startY + 60) // Label in bold
      .font('Helvetica') // Switch back to regular font for the answer
      .text(`${data.prjCode}`, 380, startY + 60) // Answer in regular font
      .moveDown();

    // Add Date Of Program and Date Of Program (To)
    doc
      .fontSize(12)
      .fillColor('#000000') // Black color for text
      .font('Helvetica-Bold') // Set bold font for labels
      .text('Date Of Program (From):', 50, startY + 90) // Label in bold
      .font('Helvetica') // Switch back to regular font for the answer
      .text(`${data.dateProg}`, 200, startY + 90) // Answer in regular font
      .font('Helvetica-Bold') // Set bold font for the next label
      .text('Date Of Program (To):', 280, startY + 90) // Label in bold
      .font('Helvetica') // Switch back to regular font for the answer
      .text(`${data.ToDate}`, 410, startY + 90) // Answer in regular font
      .moveDown();

    // Add Coversheet Number and Program Title
    doc
      .fontSize(12)
      .fillColor('#000000') // Black color for text
      .font('Helvetica-Bold') // Set bold font for labels
      .text('Coversheet Number:', 50, startY + 120) // Label in bold
      .font('Helvetica') // Switch back to regular font for the answer
      .text(`${data.coversheet}`, 180, startY + 120) // Answer in regular font
      .font('Helvetica-Bold') // Set bold font for the next label
      .text('Program Title:', 280, startY + 120) // Label in bold
      .font('Helvetica') // Switch back to regular font for the answer
      .text(`${data.progTitle}`, 380, startY + 120) // Answer in regular font
      .moveDown();

    // Add Short Note About Program
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('Short Note About Program:', 50, startY + 150) // Label in bold
      .font('Helvetica') // Switch back to regular font for the answer
      .text(data.summary, 50, startY + 170, { width: 500 }) // Answer in regular font
      .moveDown();

    // Add Expenses Summary Title
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('#000080') // Navy blue color for title
      .text('Expenses Summary', 50, startY + 220, { underline: true }) // Centered at x=50, y=220
      .moveDown();

    // Add Expenses Table with Grid and Borders
    const tableStartX = 50; // Starting X position for the table
    const tableStartY = startY + 250; // Starting Y position for the table
    const columnWidth = 120; // Width of each column
    const rowHeight = 20; // Height of each row
    const padding = 5; // Padding inside each cell

    // Function to draw a cell with borders and aligned text
    const drawCell = (text, x, y, width, height, align = 'left') => {
      // Draw cell border
      doc.rect(x, y, width, height).stroke();

      // Add text with padding and alignment
      doc
        .fontSize(12)
        .font('Helvetica')
        .fillColor('#000000') // Black color for text
        .text(text, x + padding, y + padding, {
          width: width - 2 * padding,
          height: height - 2 * padding,
          align: align,
        });
    };

    // Draw Table Headers
    doc.font('Helvetica-Bold').fillColor('#000000'); // Bold and black for headers
    drawCell('Food', tableStartX, tableStartY, columnWidth, rowHeight, 'center');
    drawCell('Travel', tableStartX + columnWidth, tableStartY, columnWidth, rowHeight, 'center');
    drawCell('Stationery', tableStartX + 2 * columnWidth, tableStartY, columnWidth, rowHeight, 'center');
    drawCell('Printing', tableStartX + 3 * columnWidth, tableStartY, columnWidth, rowHeight, 'center');

    // Draw Table Values
    doc.font('Helvetica').fillColor('#000000'); // Regular font for values
    drawCell(`${data.food}`, tableStartX, tableStartY + rowHeight, columnWidth, rowHeight, 'right');
    drawCell(`${data.travel}`, tableStartX + columnWidth, tableStartY + rowHeight, columnWidth, rowHeight, 'right');
    drawCell(`${data.stationery}`, tableStartX + 2 * columnWidth, tableStartY + rowHeight, columnWidth, rowHeight, 'right');
    drawCell(`${data.printing}`, tableStartX + 3 * columnWidth, tableStartY + rowHeight, columnWidth, rowHeight, 'right');

    // Second Row of Expenses (Headers)
    doc.font('Helvetica-Bold').fillColor('#000000'); // Bold and black for headers
    drawCell('Accommodation', tableStartX, tableStartY + 2 * rowHeight, columnWidth, rowHeight, 'center');
    drawCell('Communication', tableStartX + columnWidth, tableStartY + 2 * rowHeight, columnWidth, rowHeight, 'center');
    drawCell('Resource Person', tableStartX + 2 * columnWidth, tableStartY + 2 * rowHeight, columnWidth, rowHeight, 'center');
    drawCell('Other', tableStartX + 3 * columnWidth, tableStartY + 2 * rowHeight, columnWidth, rowHeight, 'center');

    // Second Row of Expenses (Values)
    doc.font('Helvetica').fillColor('#000000'); // Regular font for values
    drawCell(`${data.accom}`, tableStartX, tableStartY + 3 * rowHeight, columnWidth, rowHeight, 'right');
    drawCell(`${data.communication}`, tableStartX + columnWidth, tableStartY + 3 * rowHeight, columnWidth, rowHeight, 'right');
    drawCell(`${data.resource}`, tableStartX + 2 * columnWidth, tableStartY + 3 * rowHeight, columnWidth, rowHeight, 'right');
    drawCell(`${data.other}`, tableStartX + 3 * columnWidth, tableStartY + 3 * rowHeight, columnWidth, rowHeight, 'right');

    // Total Expenses
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('#000080') // Navy blue color for total
      .text(`Total: ${data.total}`, tableStartX, tableStartY + 5 * rowHeight)
      .moveDown();

    // Total Expenses In Words
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text(`Total Expenses In Word: ${data.inword}`, tableStartX , tableStartY + 7 * rowHeight)
      .moveDown();

    // Individual Cost, Vendor Cost, Total Advance Taken, Receivable/Payable
    doc
      .fontSize(12)
      .font('Helvetica')
      .fillColor('#000000') // Black color for text
      .text(`Individual Cost: ${data.individual}`, 50, tableStartY + 9 * rowHeight)
      .text(`Vendor Cost: ${data.vendor}`, 250, tableStartY + 9 * rowHeight)
      .moveDown();

    doc
      .text(`Total Advance Taken: ${data.totalAdvTake}`, 50, tableStartY + 10 * rowHeight)
      .moveDown();

    doc
      .text(`Receivable (-) / Payable (+): ${data.receivable}`, 50, tableStartY + 11 * rowHeight)
      .moveDown();

    // Footer
    doc
      .fontSize(10)
      .font('Helvetica-Oblique')
      .fillColor('#808080') // Gray color for footer
      .text('This is a system-generated document.', 50, tableStartY + 12 * rowHeight, { align: 'center' });

    doc.end();

    writeStream.on('finish', async () => {
      try {
        // Upload the generated PDF to Google Drive
        const drive = google.drive({ version: 'v3', auth });

        // Get or create the project folder
        const projectFolderId = await getOrCreateSubFolder(auth, projectName, parentFolderId);

        // Get or create the person's folder within the project folder
        const personFolderId = await getOrCreateSubFolder(auth, personName, projectFolderId);

        // Upload the PDF file to Google Drive
        const fileMetadata = {
          name: path.basename(fileName),
          parents: [personFolderId],
        };

        const media = {
          mimeType: 'application/pdf',
          body: fs.createReadStream(fileName),
        };

        const uploadedFile = await drive.files.create({
          resource: fileMetadata,
          media,
          fields: 'id',
        });

        // Delete the local PDF file after uploading
        fs.unlinkSync(fileName);

        // Return the Google Drive file ID
        resolve(uploadedFile.data.id);
      } catch (error) {
        reject(error);
      }
    });

    writeStream.on('error', (error) => {
      reject(error);
    });
  });
};


// Helper function to convert a buffer to a stream
const bufferToStream = (buffer) => {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
};

// Multer configuration for handling file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });
const handleFileUpload = upload.array('files');  

// Check if folder exists and create it if not
const getOrCreateSubFolder = async (auth, folderName, parentFolderId) => {
  const drive = google.drive({ version: 'v3', auth });

  // Search for an existing folder with the given name in the parent folder
  const res = await drive.files.list({
    q: `'${parentFolderId}' in parents and name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder'`,
    fields: 'files(id, name)',
  });

  // If the folder exists, return its ID
  if (res.data.files.length > 0) {
    return res.data.files[0].id;
  }

  // If the folder doesn't exist, create it
  const folderMetadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
    parents: [parentFolderId],
  };

  const folder = await drive.files.create({
    resource: folderMetadata,
    fields: 'id',
  });

  return folder.data.id;
};

// Upload multiple files to Google Drive in parallel
// Upload files with folder structure: project > person name
const uploadFilesToDriveWithStructure = async (auth, files, projectName, personName, parentFolderId) => {
  const drive = google.drive({ version: 'v3', auth });

  // Get or create the project folder
  const projectFolderId = await getOrCreateSubFolder(auth, projectName, parentFolderId);

  // Get or create the person's folder within the project folder
  const personFolderId = await getOrCreateSubFolder(auth, personName, projectFolderId);

  // Upload files to the person's folder
  const uploadPromises = files.map(file => {                                                                                                                                  
    const fileMetadata = {
      name: file.originalname,
      parents: [personFolderId],
    };
    const media = {
      mimeType: file.mimetype,
      body: bufferToStream(file.buffer),
    };

    return drive.files.create({
      resource: fileMetadata,
      media,
      fields: 'id',
    });
  });

  const uploadedFiles = await Promise.all(uploadPromises);
  return uploadedFiles.map(res => res.data.id); // Return file IDs
};

// Append data to Google Sheets
const appendToGoogleSheet = async (data) => {
  const auth = await authenticateGoogle();
  const sheets = google.sheets({ version: "v4", auth });

  const spreadsheetId = "1r0hlNxm7PxDDIIkvXchBsY9q6gcd0yhLpImWJ8hWHsU";
  const range = "Sheet1!A2"; // Append data below the header row

  const values = [[
    new Date().toISOString(),
    data.email,
    data.name,
    data.advSetlDate,
    data.area,
    data.placeProg,
    data.project,
    data.prjCode,
    data.coversheet,
    data.dateProg,
    data.ToDate,
    data.progTitle,
    data.summary,
    data.food,
    data.travel,
    data.stationery,
    data.printing,
    data.accom,
    data.communication,
    data.resource,
    data.other,
    data.total,
    data.inword,
    data.vendor,
    data.individual,
    data.totalAdvTake,
    data.receivable,
  ]];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: "USER_ENTERED",
    resource: { values },
  });
};


export const addSettelment = async (req, res) => {
  handleFileUpload(req, res, async (err) => {
    if (err) {
      return res.status(500).json({ message: "Error uploading file", error: err.message });
    }

    try {
      const {
        email, name, advSetlDate, area, placeProg, project, prjCode,
        coversheet, dateProg,ToDate, progTitle, summary, food, travel,
        stationery, printing, accom, communication, resource, other, total,
        inword, vendor, individual, totalAdvTake, receivable
      } = req.body;

      // Save settlement data to the database
      const newSettlement = new SettelmentData({
        email, name, advSetlDate, area, placeProg, project, prjCode, coversheet,
        dateProg,ToDate, progTitle, summary, food, travel, stationery, printing, accom,
        communication, resource, other, total, inword, vendor, individual, totalAdvTake,
        receivable, files: []  // Placeholder for file IDs
      });

      const savedSettlement = await newSettlement.save();


      // Process files and sheets update in the background
      const auth = await authenticateGoogle();
      const parentFolderId = "1qvtYTfZ_Etl5lvyuZMk_uRaJ4TBIHkha";

       // Upload files to Google Drive
       const uploadedFileIds = await uploadFilesToDriveWithStructure(auth, req.files, project, name, parentFolderId);
       savedSettlement.files = uploadedFileIds; // Save file IDs to the database
       await savedSettlement.save();

      // Generate PDF and upload it to Google Drive
      const pdfFileId = await generatePDF(savedSettlement, auth, project, name, parentFolderId);

      // Google Sheets update
      await appendToGoogleSheet(savedSettlement);

      // Send a single response after everything is completed
      return res.status(201).json({
        message: "Settlement data saved,tasks processed.",
        data: savedSettlement,
        pdfFileId: pdfFileId, 
      });

    } catch (error) {
      console.error("Error processing settlement data:", error);
      return res.status(500).json({ message: "Error processing settlement data", error: error.message });
    }
  });
};
