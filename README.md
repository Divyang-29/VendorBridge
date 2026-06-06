# VendorBridge ERP

VendorBridge is a premium, full-stack Procurement & Vendor Management ERP designed to streamline B2B procurement operations. It incorporates Indian localization (₹/INR currency grouping, GSTIN format support, and 18% automated GST calculations) alongside a dynamic role-based approval workflow.

---

## 🚀 Key Features

* **Role-Based Portals**: Interfaces tailored dynamically for **Procurement Officers**, **Vendor Partners**, **Approving Managers**, and **System Admins**.
* **RFQ & Bidding System**: Procurement officers can issue Request For Quotations (RFQs) with multiple line items, deadlines, and technical spec attachments.
* **Smart Bidding Matrix**: Side-by-side quotation comparison panel that highlights the cheapest bid (green border) and the fastest delivery timeline (purple border).
* **Managerial Approval Workflows**: Secure multi-step timeline logging where managers can review proposals and confirm/reject with audit remarks.
* **Automated Purchase Orders (POs)**: Generate sequential PO documents automatically incorporating 18% GST tax rates.
* **Digital Invoicing & PDFs**: Fulfill POs to generate digital invoices. It includes an interactive PDF downloader using `pdfkit` and an SMTP mail dispatcher.
* **Interactive Dashboard & Reports**: Dynamic widgets listing spend graphs, category-wise procurement divisions, and supplier delivery scorecard adherence rates.
* **Live Notifications**: Dropdown notification drawer on the header showing real-time transaction activity logs and alerts.

---

## 🛠️ Tech Stack

* **Frontend**: React (Vite), Vanilla CSS (premium Glassmorphism design tokens), Bootstrap 5 layout system, FontAwesome icons.
* **Backend**: Node.js, Express, MongoDB (Mongoose ODM).
* **Services**: Nodemailer (SMTP dispatch), PDFKit (dynamic server-side PDF drawing).

---

## 📁 Project Structure

```text
├── Backend/
│   ├── controllers/   # Route handler controllers (auth, rfq, po, invoice, etc.)
│   ├── models/        # Mongoose database schemas (User, Vendor, RFQ, etc.)
│   ├── routes/        # Express router mappings
│   ├── middlewares/   # Auth checks, upload handlers
│   ├── services/      # Email Nodemailer configuration
│   ├── utils/         # Helper functions (logger, tokens, OTPs)
│   └── server.js      # App entrypoint
└── frontend/
    ├── public/        # Static assets
    └── src/
        ├── components/# Layout & Sidebar navigations
        ├── context/   # Auth Session context
        ├── pages/     # Views (Quotations, Invoices, RFQs, Dashboard, etc.)
        └── utils/     # Axios API configurations
```

---

## ⚙️ Configuration & Environment Variables

Create a `.env` file inside the `Backend/` directory with the following variables:

```env
PORT=8080
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/dbname
JWT_SECRET=your_jwt_signing_key
EMAIL_USER=your_gmail_or_smtp_user@gmail.com
EMAIL_PASS=your_gmail_app_password_or_smtp_pass
```

---

## 💻 Installation & Getting Started

### 1. Backend Setup
```bash
cd Backend
npm install
npm start   # Runs on http://localhost:8080
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev # Runs on http://localhost:5173
```

---

## 🔑 Pre-Configured Test Accounts

Use these credentials (password for all is `123456`) to log in and test the system:

| Name | Role | Email |
| :--- | :--- | :--- |
| **Aashvi Barot** | Procurement Officer | `aashvi@gmail.com` |
| **Aanchal Jaiswal** | Vendor Partner | `aanchaljaiswal1000@gmail.com` |
| **Divyang Chunara** | Approving Manager | `chunaradivyang@gmail.com` |
| **Admin** | System Admin | `admin@gmail.com` |

---

## 🔄 The Procurement Lifecycle Workflow

1. **Procurement Onboarding** (Log in as `aashvi@gmail.com`):
   * Onboard the vendor profile for **Aanchal Jaiswal Enterprise** under the **Suppliers** tab if not already present.
   * Create an **RFQ** (e.g. "Bulk Shoes"), specifying items and quantities, and assign it to Aanchal's vendor profile.
2. **Vendor Bidding** (Log in as `aanchaljaiswal1000@gmail.com`):
   * Go to **RFQs**, open the assigned request, and click **Submit Quotation**.
   * Enter item pricing, delivery days, and remarks.
3. **Requisition routing** (Log in as `aashvi@gmail.com`):
   * Open the **Quotations** page, select the RFQ, and review the comparison matrix.
   * Click **Submit to Manager for Approval** and choose **Divyang Chunara**.
4. **Approval** (Log in as `chunaradivyang@gmail.com`):
   * Go to **Approvals**, review the quotation specs, click **Approve**, and enter comments.
5. **Issue PO** (Log in as `aashvi@gmail.com`):
   * Go to **Quotations**, select the accepted card, and click **Generate Purchase Order**.
6. **PO Delivery & Invoicing** (Log in as `aanchaljaiswal1000@gmail.com`):
   * Navigate to **Purchase Orders**. **Acknowledge** the PO, and then **Mark as Delivered**.
   * Click **Generate Digital Invoice**.
7. **Email Billing Invoice** (Log in as `aanchaljaiswal1000@gmail.com`):
   * Under the **Invoices** tab, download the generated PDF or dispatch it via email using the SMTP relay.
8. **Final Payment Reconciliation** (Log in as `aashvi@gmail.com`):
   * Under **Invoices**, select the invoice and click **Reconcile / Mark as Paid** to update analytical spend graphs.
