/**
 * Indian Statutory Tax & Compliance Validator for B2B Procurement
 * Validates GSTIN (15-digit alphanumeric) and MSME Udyam Registration (UDYAM-XX-00-0000000)
 */

const GST_STATE_MAP = {
  "01": "Jammu & Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "26": "Dadra & Nagar Haveli and Daman & Diu",
  "27": "Maharashtra",
  "28": "Andhra Pradesh (Old)",
  "29": "Karnataka",
  "30": "Goa",
  "31": "Lakshadweep",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Puducherry",
  "35": "Andaman & Nicobar Islands",
  "36": "Telangana",
  "37": "Andhra Pradesh",
  "38": "Ladakh",
  "97": "Other Territory",
  "99": "Centre Jurisdiction",
};

const MSME_STATE_CODES = [
  "AP", "AR", "AS", "BR", "CG", "CH", "DD", "DL", "DN", "GA",
  "GJ", "HP", "HR", "JH", "JK", "KA", "KL", "LA", "LD", "MH",
  "ML", "MN", "MP", "MZ", "NL", "OD", "PB", "PY", "RJ", "SK",
  "TN", "TR", "TS", "UK", "UP", "WB"
];

/**
 * Validates Indian GSTIN format
 * Format: 2 digits (State Code) + 10 alphanumeric (PAN) + 1 digit (entity) + 1 char ('Z') + 1 char (check digit)
 */
function validateGSTIN(gstNumber) {
  if (!gstNumber || typeof gstNumber !== "string") {
    return {
      isValid: false,
      error: "GSTIN is required.",
    };
  }

  const cleanGst = gstNumber.trim().toUpperCase();

  if (cleanGst.length !== 15) {
    return {
      isValid: false,
      error: `GSTIN must be exactly 15 characters (received ${cleanGst.length}).`,
    };
  }

  // Permissive standard format matching Indian GST format
  // Character 14 is standard 'Z' or alphanumeric in edge government registrations
  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z0-9A-Z]{1}[0-9A-Z]{1}$/;
  if (!gstRegex.test(cleanGst)) {
    return {
      isValid: false,
      error: "Invalid GSTIN format. Expected: 2 digits (State) + 10 alphanumeric (PAN) + entity + Z + check digit.",
    };
  }

  const stateCode = cleanGst.substring(0, 2);
  const stateName = GST_STATE_MAP[stateCode];

  if (!stateName) {
    return {
      isValid: false,
      error: `Invalid state code '${stateCode}' in GSTIN. Must be between 01-38 or 97/99.`,
    };
  }

  const panNumber = cleanGst.substring(2, 12);
  const entityCode = cleanGst.charAt(12);
  const checkDigit = cleanGst.charAt(14);

  return {
    isValid: true,
    gstNumber: cleanGst,
    stateCode,
    stateName,
    panNumber,
    entityCode,
    checkDigit,
  };
}

/**
 * Validates MSME Udyam Registration Number
 * Format: UDYAM-XX-00-0000000
 */
function validateMSME(msmeNumber) {
  if (!msmeNumber || typeof msmeNumber !== "string" || !msmeNumber.trim()) {
    return {
      isValid: true,
      isProvided: false,
      msmeNumber: "",
    };
  }

  const cleanMsme = msmeNumber.trim().toUpperCase();

  // Pattern: UDYAM-XX-00-0000000
  const udyamRegex = /^UDYAM-([A-Z]{2})-([0-9]{2})-([0-9]{7})$/;
  const match = cleanMsme.match(udyamRegex);

  if (!match) {
    return {
      isValid: false,
      error: "Invalid MSME Udyam format. Expected: UDYAM-XX-00-0000000 (e.g. UDYAM-MH-12-0048192).",
    };
  }

  const stateCode = match[1];
  const districtCode = match[2];
  const regSequence = match[3];

  if (!MSME_STATE_CODES.includes(stateCode)) {
    return {
      isValid: false,
      error: `Invalid State Code '${stateCode}' in MSME Udyam Number.`,
    };
  }

  return {
    isValid: true,
    isProvided: true,
    msmeNumber: cleanMsme,
    stateCode,
    districtCode,
    regSequence,
  };
}

module.exports = {
  GST_STATE_MAP,
  MSME_STATE_CODES,
  validateGSTIN,
  validateMSME,
};
