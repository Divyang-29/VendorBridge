const Invoice = require("../models/Invoice");
const PurchaseOrder = require("../models/PurchaseOrder");
const Vendor = require("../models/Vendor");
const User = require("../models/User");
const { getVendorProfileForUser } = require("./rfqController");
const logActivity = require("../utils/logger");
const transporter = require("../services/emailService");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

// ======================================
// Helper: Generate PDF Invoice File
// ======================================
const generateInvoicePDF = (invoice, po, vendor) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const filename = `invoice-${invoice.invoiceNumber}.pdf`;
      const uploadDir = path.join(__dirname, "../uploads");
      
      // Ensure upload directory exists
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      const filePath = path.join(uploadDir, filename);
      const writeStream = fs.createWriteStream(filePath);

      doc.pipe(writeStream);

      // --- PDF Styling & Header ---
      doc.fillColor("#4A3AFF").fontSize(26).text("VendorBridge", 50, 45);
      doc.fillColor("#333333").fontSize(10).text("Procurement & Vendor Management ERP", 50, 75);
      
      doc.fontSize(18).fillColor("#111111").text("INVOICE", 400, 45, { align: "right" });
      doc.fontSize(10).fillColor("#777777")
        .text(`Invoice Number: ${invoice.invoiceNumber}`, 400, 70, { align: "right" })
        .text(`Date: ${new Date(invoice.createdAt || Date.now()).toLocaleDateString()}`, 400, 85, { align: "right" })
        .text(`PO Ref: ${po.poNumber}`, 400, 100, { align: "right" });

      // Horizontal line separator
      doc.moveTo(50, 120).lineTo(550, 120).stroke("#EAEAEA");

      // --- Bill To & Vendor Info ---
      doc.fontSize(11).fillColor("#777777").text("ISSUED BY VENDOR:", 50, 140);
      doc.fontSize(13).fillColor("#111111").text(vendor.vendorName, 50, 158);
      doc.fontSize(10).fillColor("#444444")
        .text(`GSTIN: ${vendor.gstNumber}`, 50, 176)
        .text(`Email: ${vendor.email}`, 50, 191)
        .text(`Phone: ${vendor.phone}`, 50, 206)
        .text(`Address: ${vendor.address}`, 50, 221);

      doc.fontSize(11).fillColor("#777777").text("BILL TO (ORGANIZATION):", 320, 140);
      doc.fontSize(13).fillColor("#111111").text("VendorBridge Corporate Office", 320, 158);
      doc.fontSize(10).fillColor("#444444")
        .text("GSTIN: 27AAAAA1111A1Z1", 320, 176)
        .text("Email: procurement@vendorbridge.com", 320, 191)
        .text("Address: 100 Innovation Way, Tech Park, Mumbai", 320, 206);

      // Horizontal line separator
      doc.moveTo(50, 260).lineTo(550, 260).stroke("#EAEAEA");

      // --- Items Table Header ---
      let y = 280;
      doc.fillColor("#4A3AFF").fontSize(10)
        .text("Item Name", 50, y, { bold: true })
        .text("Qty", 250, y, { width: 50, align: "right" })
        .text("Price (Rs.)", 320, y, { width: 80, align: "right" })
        .text("Subtotal (Rs.)", 430, y, { width: 120, align: "right" });

      doc.moveTo(50, y + 15).lineTo(550, y + 15).stroke("#EAEAEA");

      // --- Items Table Rows ---
      doc.fillColor("#333333");
      y += 25;
      invoice.items.forEach((item) => {
        doc.text(item.itemName, 50, y, { width: 190 });
        doc.text(item.quantity.toString(), 250, y, { width: 50, align: "right" });
        doc.text(item.price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 320, y, { width: 80, align: "right" });
        doc.text(item.subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 430, y, { width: 120, align: "right" });
        
        y += 20;
      });

      doc.moveTo(50, y + 5).lineTo(550, y + 5).stroke("#EAEAEA");

      // --- Summary Section ---
      y += 15;
      const subtotal = invoice.totalAmount - invoice.taxAmount;
      doc.fontSize(10).fillColor("#555555")
        .text("Subtotal:", 320, y, { width: 100, align: "right" })
        .text(`Rs. ${subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 430, y, { width: 120, align: "right" });

      y += 18;
      doc.text("GST Tax (18%):", 320, y, { width: 100, align: "right" })
        .text(`Rs. ${invoice.taxAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 430, y, { width: 120, align: "right" });

      y += 20;
      doc.fontSize(12).fillColor("#111111")
        .text("Grand Total:", 320, y, { width: 100, align: "right", bold: true })
        .text(`Rs. ${invoice.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 430, y, { width: 120, align: "right", bold: true });

      // --- Footer ---
      doc.fontSize(9).fillColor("#999999").text(
        "Thank you for doing business with VendorBridge. For any queries, write to accounts@vendorbridge.com",
        50,
        700,
        { align: "center", width: 500 }
      );

      doc.end();

      writeStream.on("finish", () => {
        resolve(filePath);
      });

      writeStream.on("error", (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
};

// ======================================
// Create Invoice
// ======================================
const createInvoice = async (req, res) => {
  try {
    const { poId } = req.body;

    if (!poId) {
      return res.status(400).json({
        success: false,
        message: "poId is required",
      });
    }

    // Verify PO exists and is not cancelled
    const po = await PurchaseOrder.findById(poId).populate("vendorId");
    if (!po) {
      return res.status(404).json({
        success: false,
        message: "Purchase Order not found",
      });
    }

    if (po.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cannot generate invoice from a cancelled Purchase Order",
      });
    }

    // Check if invoice already exists for this PO
    const existingInvoice = await Invoice.findOne({ poId });
    if (existingInvoice) {
      return res.status(400).json({
        success: false,
        message: "An invoice has already been generated for this Purchase Order",
        invoice: existingInvoice,
      });
    }

    // Generate unique sequential Invoice number
    const today = new Date();
    const dateStr = today.getFullYear() +
      String(today.getMonth() + 1).padStart(2, "0") +
      String(today.getDate()).padStart(2, "0");
    const count = await Invoice.countDocuments({
      invoiceNumber: new RegExp(`^INV-${dateStr}-`),
    });
    const seq = String(count + 1).padStart(4, "0");
    const invoiceNumber = `INV-${dateStr}-${seq}`;

    // Map items from PO
    const items = po.items.map((item) => ({
      itemName: item.itemName,
      description: item.description,
      quantity: item.quantity,
      price: item.price,
      subtotal: item.subtotal,
    }));

    // Create Invoice DB Entry
    const invoice = new Invoice({
      invoiceNumber,
      poId: po._id,
      vendorId: po.vendorId._id,
      items,
      taxAmount: po.taxAmount,
      totalAmount: po.totalAmount,
      status: "pending_payment",
      createdBy: req.user.userId,
    });

    // Generate PDF File and save path
    const pdfFilePath = await generateInvoicePDF(invoice, po, po.vendorId);
    invoice.pdfPath = pdfFilePath;
    await invoice.save();

    await logActivity(
      req.user.userId,
      "GENERATE_INVOICE",
      "Invoice",
      invoice._id,
      `Generated invoice ${invoice.invoiceNumber} for Purchase Order ${po.poNumber}`
    );

    res.status(201).json({
      success: true,
      message: "Invoice generated successfully",
      invoice,
    });
  } catch (error) {
    console.error("Create Invoice Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// ======================================
// Get All Invoices
// ======================================
const getAllInvoices = async (req, res) => {
  try {
    const query = {};

    // Vendor visibility filter
    if (req.user.role === "vendor") {
      const vendorProfile = await getVendorProfileForUser(req.user);
      if (!vendorProfile) {
        return res.status(200).json({
          success: true,
          count: 0,
          invoices: [],
        });
      }
      query.vendorId = vendorProfile._id;
    }

    const invoices = await Invoice.find(query)
      .populate("poId", "poNumber")
      .populate("vendorId", "vendorName category email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: invoices.length,
      invoices,
    });
  } catch (error) {
    console.error("Get All Invoices Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// ======================================
// Get Invoice By ID
// ======================================
const getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate("poId", "poNumber createdAt totalAmount status")
      .populate("vendorId", "vendorName category email phone address gstNumber");

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    // Verify vendor access
    if (req.user.role === "vendor") {
      const vendorProfile = await getVendorProfileForUser(req.user);
      if (!vendorProfile || !invoice.vendorId._id.equals(vendorProfile._id)) {
        return res.status(403).json({
          success: false,
          message: "Access Denied: You cannot view this invoice",
        });
      }
    }

    res.status(200).json({
      success: true,
      invoice,
    });
  } catch (error) {
    console.error("Get Invoice By ID Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// ======================================
// Download Invoice PDF
// ======================================
const downloadInvoicePDFEndpoint = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    // Verify vendor access
    if (req.user.role === "vendor") {
      const vendorProfile = await getVendorProfileForUser(req.user);
      if (!vendorProfile || !invoice.vendorId.equals(vendorProfile._id)) {
        return res.status(403).json({
          success: false,
          message: "Access Denied",
        });
      }
    }

    // Regenerate if file missing
    if (!invoice.pdfPath || !fs.existsSync(invoice.pdfPath)) {
      const po = invoice.poId && invoice.poId.poNumber ? invoice.poId : await PurchaseOrder.findById(invoice.poId);
      const vendor = invoice.vendorId && invoice.vendorId.vendorName ? invoice.vendorId : await Vendor.findById(invoice.vendorId);
      if (po && vendor) {
        invoice.pdfPath = await generateInvoicePDF(invoice, po, vendor);
        await invoice.save();
      } else {
        return res.status(404).json({
          success: false,
          message: "Unable to generate PDF: references missing",
        });
      }
    }

    res.download(invoice.pdfPath, `Invoice-${invoice.invoiceNumber}.pdf`);
  } catch (error) {
    console.error("Download PDF Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// ======================================
// Send Invoice via Email
// ======================================
const sendInvoiceEmail = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate("vendorId")
      .populate("poId");

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    // Verify vendor access
    if (req.user.role === "vendor") {
      const vendorProfile = await getVendorProfileForUser(req.user);
      if (!vendorProfile || !invoice.vendorId._id.equals(vendorProfile._id)) {
        return res.status(403).json({
          success: false,
          message: "Access Denied: You cannot send emails for this invoice",
        });
      }
    }

    // Recipient email (either from vendor profile, or input)
    const { recipientEmail } = req.body;
    const toEmail = recipientEmail || invoice.vendorId.email;

    if (!toEmail) {
      return res.status(400).json({
        success: false,
        message: "Recipient email is required",
      });
    }

    // Ensure PDF exists
    if (!invoice.pdfPath || !fs.existsSync(invoice.pdfPath)) {
      const po = invoice.poId && invoice.poId.poNumber ? invoice.poId : await PurchaseOrder.findById(invoice.poId);
      const vendor = invoice.vendorId && invoice.vendorId.vendorName ? invoice.vendorId : await Vendor.findById(invoice.vendorId);
      invoice.pdfPath = await generateInvoicePDF(invoice, po, vendor);
      await invoice.save();
    }

    // Send email using the nodemailer transporter
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: toEmail,
      subject: `VendorBridge ERP - Invoice ${invoice.invoiceNumber}`,
      html: `
        <h2>VendorBridge ERP</h2>
        <p>Dear Partner,</p>
        <p>Please find attached the digital invoice <strong>${invoice.invoiceNumber}</strong> generated for Purchase Order <strong>${invoice.poId.poNumber}</strong>.</p>
        <br/>
        <p><strong>Invoice details:</strong></p>
        <ul>
          <li>Invoice Number: ${invoice.invoiceNumber}</li>
          <li>Total Amount: Rs. ${invoice.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</li>
          <li>Status: ${invoice.status}</li>
        </ul>
        <br/>
        <p>Sincerely,<br/>Procurement Team</p>
      `,
      attachments: [
        {
          filename: `Invoice-${invoice.invoiceNumber}.pdf`,
          path: invoice.pdfPath,
        },
      ],
    });

    await logActivity(
      req.user.userId,
      "SEND_INVOICE_EMAIL",
      "Invoice",
      invoice._id,
      `Emailed invoice ${invoice.invoiceNumber} to ${toEmail}`
    );

    res.status(200).json({
      success: true,
      message: `Invoice emailed successfully to ${toEmail}`,
    });
  } catch (error) {
    console.error("Send Invoice Email Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// ======================================
// Update Invoice Status (e.g. Paid)
// ======================================
const updateInvoiceStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    const validStatuses = ["pending_payment", "paid", "overdue", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    // Only Admin, Procurement or Manager can update payment status
    if (!["admin", "procurement", "manager"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access Denied: You are not authorized to update payment status",
      });
    }

    invoice.status = status;
    await invoice.save();

    await logActivity(
      req.user.userId,
      "UPDATE_INVOICE_STATUS",
      "Invoice",
      invoice._id,
      `Updated Invoice ${invoice.invoiceNumber} status to ${status}`
    );

    res.status(200).json({
      success: true,
      message: "Invoice status updated successfully",
      invoice,
    });
  } catch (error) {
    console.error("Update Invoice Status Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

module.exports = {
  createInvoice,
  getAllInvoices,
  getInvoiceById,
  downloadInvoicePDF: downloadInvoicePDFEndpoint,
  sendInvoiceEmail,
  updateInvoiceStatus,
};
