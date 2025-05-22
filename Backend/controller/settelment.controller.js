import SettelmentData from "../model/settelmen.model.js";
import multer from "multer";
import { google } from "googleapis";
import { Readable } from "stream";
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { JWT } from "google-auth-library";

// Authenticate with Google APIsfrontend
const authenticateGoogle = async () => {
  try {
    const googleCredentials = process.env.GOOGLE_CREDENTIALS;
    console.log("GOOGLE_CREDENTIALS:", googleCredentials); // Debugging line

    if (!googleCredentials) {
      throw new Error("Google credentials environment variable is not set.");
    }

    // Step 1: Parse the outer JSON string to remove escaped characters
    const unescapedCredentials = JSON.parse(googleCredentials);

    // Step 2: Parse the inner JSON string to get the credentials object
    const credentials = JSON.parse(unescapedCredentials);
    console.log("Parsed Credentials:", credentials); // Debugging line

    // Log the private_key to verify it's correct
    console.log("Private Key:", credentials.private_key);

    // Create a JWT client using the credentials
    const authClient = new JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive",
      ],
    });

    // Authenticate the client
    await authClient.authorize();
    return authClient;
  } catch (error) {
    console.error('Error authenticating with Google:', error);
    throw new Error('Google authentication failed');
  }
};

const getCurrentDateFolderName = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, '0'); // Ensure 2 digits
  const day = today.getDate().toString().padStart(2, '0'); // Ensure 2 digits
  return `${year}-${month}-${day}`; // Returns a string like '2025-03-19'
};                        

export const downloadPDF = async (req, res) => {
  const { fileId } = req.query;

  // Validate file ID
if (!fileId) {
  throw new Error("Missing file ID — can't download");
}

  try {
    const authClient = await authenticateGoogle();
    const drive = google.drive({ 
      version: 'v3', 
      auth: authClient,
      params: {
        key: 'AIzaSyCxbGmn3QuS4F1YLAx_i9vxeaY4fW5CqzA', // Replace with your real API key
        supportsAllDrives: true,
        includeItemsFromAllDrives: true
      }
    });

    // Get the file metadata
    const fileMetadata = await drive.files.get({
      fileId,
      fields: 'name',
    });

    // Sanitize the filename
    const fileName = fileMetadata.data.name.replace(/[^\w.-]/g, '_'); // Replace invalid characters with underscores
    const encodedFileName = encodeURIComponent(fileName); // Encode the filename for the header

    // Stream the file from Google Drive
    const fileStream = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' }
    );

    // Set response headers for download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodedFileName}"`);

    // Pipe the file stream to the response
    fileStream.data.pipe(res);
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ message: 'Error downloading file' });
  }
};

const generatePDF = async (data, authClient, projectName, personName, parentFolderId) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const fileName = `./pdfs/${data.name}_settlement_${Date.now()}.pdf`;

    // Create directory if not exists
    if (!fs.existsSync('./pdfs')) fs.mkdirSync('./pdfs');

    const writeStream = fs.createWriteStream(fileName);
    doc.pipe(writeStream);

    // Register the Devanagari font
    doc.registerFont('Devanagari', './Font/NotoSansDevanagari-Regular.ttf');

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
      .fontSize(16)
      .font('Helvetica-Bold')
      .fillColor('#000080') // Navy blue color for title
      .text('EXPENDITURE SETTLEMENT SHEET', 50, 130, { align: 'center', underline: true }) // Centered at x=50, y=150
      .moveDown();

    // Add Person Name and Advance Settlement Date
    let startY = 170; // Starting Y position for details
    doc
      .fontSize(10)
      .fillColor('#000000') // Black color for text
      .font('Helvetica-Bold') // Set bold font for labels
      .text('Person Name:', 50, startY) // Label in bold
      .font('Devanagari') // Switch back to regular font for the answer
      .text(`${data.name}`, 150, startY) // Answer in regular font
      .font('Helvetica-Bold') // Set bold font for the next label
      .text('Advance Settlement Date:', 280, startY) // Label in bold
      .font('Helvetica') // Switch back to regular font for the answer
      .text(`${data.advSetlDate}`, 450, startY) // Answer in regular font
      .moveDown();

    // Add Region / City / Area and Project
    startY += 30; // Move Y position down by 30 units
    doc
      .fontSize(10)
      .fillColor('#000000') // Black color for text
      .font('Helvetica-Bold') // Set bold font for labels
      .text('Region / City / Area:', 50, startY) // Label in bold
      .font('Devanagari') // Switch back to regular font for the answer
      .text(`${data.area}`, 180, startY) // Answer in regular font
      .font('Helvetica-Bold') // Set bold font for the next label
      .text('Project:', 280, startY) // Label in bold
      .font('Helvetica') // Switch back to regular font for the answer
      .text(`${data.project}`, 350, startY) // Answer in regular font
      .moveDown();

    // Add Place Of Program and Project Code
    startY += 30; // Move Y position down by 30 units
    doc
      .fontSize(10)
      .fillColor('#000000') // Black color for text
      .font('Helvetica-Bold') // Set bold font for labels
      .text('Place Of Program:', 50, startY) // Label in bold
      .font('Devanagari') // Switch back to regular font for the answer
      .text(`${data.placeProg}`, 180, startY) // Answer in regular font
      .font('Helvetica-Bold') // Set bold font for the next label
      .text('Project Code:', 280, startY) // Label in bold
      .font('Devanagari') // Switch back to regular font for the answer
      .text(`${data.prjCode}`, 380, startY) // Answer in regular font
      .moveDown();

    // Add Date Of Program and Date Of Program (To)
    startY += 30; // Move Y position down by 30 units
    doc
      .fontSize(10)
      .fillColor('#000000') // Black color for text
      .font('Helvetica-Bold') // Set bold font for labels
      .text('Date Of Program (From):', 50, startY) // Label in bold
      .font('Helvetica') // Switch back to regular font for the answer
      .text(`${data.dateProg}`, 200, startY) // Answer in regular font
      .font('Helvetica-Bold') // Set bold font for the next label
      .text('Date Of Program (To):', 280, startY) // Label in bold
      .font('Helvetica') // Switch back to regular font for the answer
      .text(`${data.ToDate}`, 410, startY) // Answer in regular font
      .moveDown();

    // Add Coversheet Number and Program Title
    startY += 30; // Move Y position down by 30 units
    doc
      .fontSize(10)
      .fillColor('#000000') // Black color for text
      .font('Helvetica-Bold') // Set bold font for labels
      .text('Coversheet Number:', 50, startY) // Label in bold
      .font('Devanagari') // Switch back to regular font for the answer
      .text(`${data.coversheet}`, 180, startY) // Answer in regular font
      .font('Helvetica-Bold') // Set bold font for the next label
      .text('Program Title:', 280, startY) // Label in bold
      .font('Devanagari') // Switch back to regular font for the answer
      .text(`${data.progTitle}`, 380, startY) // Answer in regular font
      .moveDown();

    // Add Short Note About Program
    const shortNoteLabel = 'Short Note About Program:';
    const shortNoteText = data.summary;

    // Draw the label
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text(shortNoteLabel, 50, startY + 30); // Label in bold

    // Define text properties
    const fontSize = 8; // Font size
    const lineHeight = fontSize * 1.2; // Line height (1.2 times the font size)
    const maxWidth = 500; // Constrain text to 500 units width

    // Custom function to split Devanagari text into lines
    const splitDevanagariTextIntoLines = (text, maxWidth) => {
      const words = text.split(' ');
      let lines = [];
      let currentLine = '';

      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = doc.widthOfString(testLine, { font: 'Devanagari', fontSize });

        if (testWidth <= maxWidth) {
          currentLine = testLine; // Add the word to the current line
        } else {
          if (currentLine) {
            lines.push(currentLine); // Push the current line to the lines array
          }
          currentLine = word; // Start a new line with the current word
        }
      }

      if (currentLine) {
        lines.push(currentLine); // Add the last line
      }

      return lines;
    };

    // Split the Devanagari text into lines
    const lines = splitDevanagariTextIntoLines(shortNoteText, maxWidth);

    // Calculate the height of the text block
    const textHeight = lines.length * lineHeight;

    // Draw the text block
    doc
      .font('Devanagari') // Switch back to regular font for the answer
      .fontSize(fontSize)
      .text(lines.join('\n'), 50, startY + 50, {
        width: maxWidth,
        lineGap: lineHeight - fontSize, // Adjust line gap to match line height
        align: 'left',
      });

    // Adjust the starting Y position for the next section
    const nextSectionY = startY + 50 + textHeight + 20; // Add some padding (e.g., 20 units)

    // Add Expenses Scheme Title
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#000080') // Navy blue color for title
      .text('Expenses Summary', 50, nextSectionY, { underline: true }) // Use nextSectionY
      .moveDown();

    // Add Expenses Table with Grid and Borders
    const tableStartX = 50; // Starting X position for the table
    const tableStartY = nextSectionY + 30; // Starting Y position for the table
    const columnWidth = 120; // Width of each column
    const rowHeight = 20; // Height of each row
    const padding = 5; // Padding inside each cell

    // Function to draw a cell with borders and aligned text
    const drawCell = (text, x, y, width, height, align = 'left') => {
      // Draw cell border
      doc.rect(x, y, width, height).stroke();

      // Add text with padding and alignment
      doc
        .fontSize(10)
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
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#000080') // Navy blue color for total
      .text(`Total: ${data.total}`, tableStartX, tableStartY + 5 * rowHeight)
      .moveDown();

    // Total Expenses In Words
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('Total Expenses In Word:', tableStartX, tableStartY + 6 * rowHeight)
      .font('Devanagari')
      .text(data.inword, tableStartX + 120, tableStartY + 6 * rowHeight)
      .moveDown();

    // Individual Cost, Vendor Cost, Total Advance Taken, Receivable/Payable
    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#000000') // Black color for text
      .text(`Individual Cost: ${data.individual}`, 50, tableStartY + 8 * rowHeight)
      .text(`Vendor Cost: ${data.vendor}`, 250, tableStartY + 8 * rowHeight)
      .moveDown();

    doc
      .text(`Total Advance Taken: ${data.totalAdvTake}`, 50, tableStartY + 9 * rowHeight)
      .moveDown();

    doc
      .text(`Receivable (-) / Payable (+): ${data.receivable}`, 50, tableStartY + 10 * rowHeight)
      .moveDown();

    // Add "Entered By" and email at the bottom right
    const bottomY = doc.page.height - 50; // Position 50 units from the bottom
    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#000000') // Black color for text
      .text(data.email, { align: 'left' }) // Email aligned to the right
      .font('Helvetica-Bold')
      .text('Entered By', { align: 'left' }); // "Entered By" aligned to the right

    doc.end();

    writeStream.on('finish', async () => {
      try {
        // Upload the generated PDF to Google Drive                       
        const drive = google.drive({ 
          version: 'v3', 
          auth: authClient,
          params: {
            key: 'AIzaSyCxbGmn3QuS4F1YLAx_i9vxeaY4fW5CqzA',
            supportsAllDrives: true,
            includeItemsFromAllDrives: true
          }
        });

        // Get or create the project folder
        const projectFolderId = await getOrCreateSubFolder(authClient, projectName, parentFolderId);

        // Get or create the person's folder within the project folder
        const personFolderId = await getOrCreateSubFolder(authClient, personName, projectFolderId);

        // Get or create the date folder under the person folder
        const dateFolderId = await getOrCreateDateFolder(authClient, personFolderId);

        // Upload the PDF file to the date-specific folder
        const fileMetadata = {
          name: path.basename(fileName),
          parents: [dateFolderId], // Uploading to the date folder
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



// Update getOrCreateSubFolder to handle date subfolder
const getOrCreateDateFolder = async (authClient, personFolderId) => {
  const dateFolderName = getCurrentDateFolderName();
  const drive = google.drive({ 
    version: 'v3',
    auth:authClient,
    params: {
      key: 'AIzaSyCxbGmn3QuS4F1YLAx_i9vxeaY4fW5CqzA',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true
    }
    });

  try {
    // Search for today's date folder inside the person's folder
    const res = await drive.files.list({
      q: `'${personFolderId}' in parents and name = '${dateFolderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
    });

    if (res.data.files.length > 0) {
      console.log(`Date folder "${dateFolderName}" already exists.`);
      return res.data.files[0].id; // Return existing folder ID
    }

    // Create a new folder if not found
    console.log(`Creating date folder "${dateFolderName}"...`);
    const folderMetadata = {
      name: dateFolderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [personFolderId],
    };

    const folder = await drive.files.create({
      resource: folderMetadata,
      fields: 'id',
    });

    return folder.data.id;
  } catch (error) {
    console.error('Error in getOrCreateDateFolder:', error);
    throw error;
  }
};


// Check if folder exists and create it if not
const getOrCreateSubFolder = async (authClient, folderName, parentFolderId) => {
  const drive = google.drive({
    version: 'v3',
    auth: authClient,
    // Add these critical parameters:
    params: {
      key: 'AIzaSyCxbGmn3QuS4F1YLAx_i9vxeaY4fW5CqzA',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true
    }
  });

  try {
    const res = await drive.files.list({
      q: `'${parentFolderId}' in parents and name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id)',
      corpora: 'allDrives' // Required for shared drives
    });

    if (res.data.files.length > 0) {
      return res.data.files[0].id;
    }

    const folder = await drive.files.create({
      resource: {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentFolderId],
        driveId: parentFolderId.split('_')[0] // For Team Drives
      },
      fields: 'id',
      supportsAllDrives: true
    });

    return folder.data.id;
  } catch (error) {
    console.error('Drive API Error:', {
      message: error.message,
      config: error.config,
      response: error.response?.data
    });
    throw error;
  }
};          
// Upload files with folder structure: project > person name
const uploadFilesToDriveWithStructure = async (authClient, files, projectName, personName, parentFolderId) => {
  const drive = google.drive({ 
    version: 'v3', 
    auth:authClient ,
    params: {
      key: 'AIzaSyCxbGmn3QuS4F1YLAx_i9vxeaY4fW5CqzA',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true
    }
  });

  // Get or create the project folder
  const projectFolderId = await getOrCreateSubFolder(authClient, projectName, parentFolderId);

  // Get or create the person's folder within the project folder
  const personFolderId = await getOrCreateSubFolder(authClient, personName, projectFolderId);

  // Get or create today's date folder inside the person's folder
  const dateFolderId = await getOrCreateDateFolder(authClient, personFolderId);

  
  // Upload files to the date folder
  const uploadPromises = files.map(file => {
    const fileMetadata = {
      name: file.originalname,
      parents: [dateFolderId], // Upload to the date folder
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
const appendToGoogleSheet = async (data ,authClient) => {
  const auth = await authenticateGoogle();
  const sheets = google.sheets({ version: "v4", auth });

  const spreadsheetId = "1r0hlNxm7PxDDIIkvXchBsY9q6gcd0yhLpImWJ8hWHsU";
  const projectName = data.project;

  // Check if the sheet for the project exists
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId,
  });

  const sheetExists = spreadsheet.data.sheets.some(sheet => sheet.properties.title === projectName);

  if (!sheetExists) {
    // Create a new sheet for the project
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: {
        requests: [
          {
            addSheet: {
              properties: {
                title: projectName,
              },
            },
          },
        ],
      },
    });

    // Add headers to the new sheet
    const headers = [
      "Timestamp", "Email", "Name", "Advance Settlement Date", "Region / City / Area", "Place Of Program",
      "Project", "Project Code", "Coversheet Number", "Date Of Program (From)", "Date Of Program (To)",
      "Program Title", "Short Note About Program", "Food", "Travel", "Stationery", "Printing", "Accommodation",
      "Communication", "Resource Person", "Other", "Total", "Total In Words", "Vendor Cost", "Individual Cost",
      "Total Advance Taken", "Receivable/Payable"
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${projectName}!A1`,
      valueInputOption: "USER_ENTERED",
      resource: {
        values: [headers],
      },
    });
  }

  // Append data to the project's sheet
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
    range: `${projectName}!A2`,
    valueInputOption: "USER_ENTERED",
    resource: { values },
  });
};

// Multer configuration for handling file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });
const handleFileUpload = upload.array('files');  
export const addSettelment = async (req, res) => {
  handleFileUpload(req, res, async (err) => {
    if (err) return res.status(500).json({ message: "File upload failed", error: err.message });

    try {
      const requiredFields = ['email', 'name', 'advSetlDate', 'area', 'placeProg', 'project'];
      const fieldErrors = {};

      requiredFields.forEach(field => {
        if (!req.body[field]) {
          fieldErrors[field] = `${field} is required`;
        }
      });

      if (Object.keys(fieldErrors).length > 0) {
        return res.status(400).json({
          message: "Validation failed",
          fieldErrors
        });
      }

      const {
        email, name, advSetlDate, area, placeProg, project, prjCode,
        coversheet, dateProg, ToDate, progTitle, summary, food, travel,
        stationery, printing, accom, communication, resource, other, total,
        inword, vendor, individual, totalAdvTake, receivable
      } = req.body;

      // Save to MongoDB
      const newSettlement = new SettelmentData({
        email, name, advSetlDate, area, placeProg, project, prjCode, coversheet,
        dateProg, ToDate, progTitle, summary, food, travel, stationery, printing, accom,
        communication, resource, other, total, inword, vendor, individual, totalAdvTake,
        receivable, files: []
      });

      const savedSettlement = await newSettlement.save();

      // Authenticate and do background tasks
      const authClient = await authenticateGoogle();
      const parentFolderId = "1qvtYTfZ_Etl5lvyuZMk_uRaJ4TBIHkha";

      const uploadedFileIds = await uploadFilesToDriveWithStructure(authClient, req.files, project, name, parentFolderId);
      savedSettlement.files = uploadedFileIds;

      const pdfFileId = await generatePDF(savedSettlement, authClient, project, name, parentFolderId);
      savedSettlement.pdfFileId = pdfFileId;

      await savedSettlement.save();
      await appendToGoogleSheet(savedSettlement, authClient);

      // ✅ Finally respond after everything is done
      return res.status(201).json({
        message: "Settlement saved and all tasks completed.",
        data: savedSettlement,
        pdfFileId: pdfFileId,
      });

    } catch (error) {
      console.error("Error processing settlement data:", error);
      return res.status(500).json({
        message: "Error processing settlement data",
        error: error.message
      });
    }
  });
};
