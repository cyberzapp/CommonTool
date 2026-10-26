import React, { useState, useEffect, useMemo, useRef } from 'react';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { triggerDownloadWithSuccessPage } from '../../lib/downloadManager';
import {
  Receipt,
  Plus,
  Trash2,
  Download,
  Save,
  CheckCircle2,
  Info,
  QrCode,
  Building2,
  Printer,
  Upload,
  FileJson,
  Sparkles,
  Eye,
  Edit3,
  RotateCcw,
  Palette,
  Percent,
} from 'lucide-react';

export type InvoiceTheme = 'slate' | 'indigo' | 'emerald' | 'crimson' | 'monochrome';

export interface LineItem {
  id: string;
  description: string;
  hsnSac?: string;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
}

export interface BankDetails {
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  ifscOrSwift: string;
  upiId: string;
}

export interface SavedInvoice {
  id: string;
  theme: InvoiceTheme;
  docType: 'INVOICE' | 'RECEIPT' | 'PROFORMA';
  docNumber: string;
  issueDate: string;
  dueDate: string;
  currencyCode: string;
  currencySymbol: string;
  fromName: string;
  fromGstin?: string;
  fromDetails: string;
  toName: string;
  toGstin?: string;
  toDetails: string;
  items: LineItem[];
  taxMode: 'single' | 'gst' | 'none';
  taxRate: number; // for single
  cgstRate: number; // for gst
  sgstRate: number; // for gst
  igstRate: number; // for gst
  isInterState: boolean;
  discountAmount: number;
  shippingFee: number;
  notes: string;
  bankDetails: BankDetails;
  showQrCode: boolean;
  logoDataUrl?: string | null;
  savedAt: string;
}

const THEME_CONFIGS: Record<
  InvoiceTheme,
  {
    name: string;
    rgb: [number, number, number];
    accentHex: string;
    bgClass: string;
    badgeClass: string;
  }
> = {
  indigo: {
    name: 'Modern Indigo',
    rgb: [79, 70, 229], // #4f46e5
    accentHex: '#4f46e5',
    bgClass: 'bg-indigo-600',
    badgeClass: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
  },
  slate: {
    name: 'Executive Slate',
    rgb: [15, 23, 42], // #0f172a
    accentHex: '#0f172a',
    bgClass: 'bg-slate-900',
    badgeClass: 'bg-slate-800 text-slate-300 border-slate-700',
  },
  emerald: {
    name: 'Clean Emerald',
    rgb: [16, 185, 129], // #10b981
    accentHex: '#10b981',
    bgClass: 'bg-emerald-600',
    badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  },
  crimson: {
    name: 'Ruby Crimson',
    rgb: [225, 29, 72], // #e11d48
    accentHex: '#e11d48',
    bgClass: 'bg-rose-600',
    badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  },
  monochrome: {
    name: 'Ink Minimalist',
    rgb: [39, 39, 42], // #27272a
    accentHex: '#27272a',
    bgClass: 'bg-zinc-800',
    badgeClass: 'bg-zinc-800 text-zinc-300 border-zinc-700',
  },
};

const CURRENCIES = [
  { code: 'INR', symbol: '₹', label: 'INR (₹ Indian Rupee)' },
  { code: 'USD', symbol: '$', label: 'USD ($ US Dollar)' },
  { code: 'EUR', symbol: '€', label: 'EUR (€ Euro)' },
  { code: 'GBP', symbol: '£', label: 'GBP (£ British Pound)' },
  { code: 'CAD', symbol: 'CA$', label: 'CAD (CA$ Canadian Dollar)' },
  { code: 'AUD', symbol: 'A$', label: 'AUD (A$ Australian Dollar)' },
  { code: 'AED', symbol: 'AED', label: 'AED (UAE Dirham)' },
  { code: 'SGD', symbol: 'S$', label: 'SGD (S$ Singapore Dollar)' },
  { code: 'JPY', symbol: '¥', label: 'JPY (¥ Japanese Yen)' },
];

const STORAGE_KEY = 'commontool_saved_invoices_v2';
const LEGACY_STORAGE_KEY = 'commontool_saved_invoices';

export const InvoiceGenerator: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [theme, setTheme] = useState<InvoiceTheme>('indigo');
  const [docType, setDocType] = useState<'INVOICE' | 'RECEIPT' | 'PROFORMA'>('INVOICE');
  const [docNumber, setDocNumber] = useState('INV-2026-001');
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });
  const [currency, setCurrency] = useState(CURRENCIES[0]); // INR default for Indian and global users

  // Parties & Tax ID
  const [fromName, setFromName] = useState('Breathy Tech Studio');
  const [fromGstin, setFromGstin] = useState('19AABCB1234F1Z6');
  const [fromDetails, setFromDetails] = useState(
    'Kolkata, West Bengal, India\nsupport@breathy.in • https://commontool.breathy.in'
  );
  const [toName, setToName] = useState('Horizon Global Enterprises');
  const [toGstin, setToGstin] = useState('');
  const [toDetails, setToDetails] = useState('Suite 400, Financial District\naccounts@horizonglobal.com');

  // Items
  const [items, setItems] = useState<LineItem[]>([
    {
      id: '1',
      description: 'Web Application Architecture & Custom UI System Design',
      hsnSac: '998314',
      quantity: 1,
      unitPrice: 35000,
      discountPercent: 0,
    },
    {
      id: '2',
      description: 'Client-Side WebAssembly Processing Engine Integration',
      hsnSac: '998313',
      quantity: 1,
      unitPrice: 18500,
      discountPercent: 5,
    },
    {
      id: '3',
      description: 'Security Hardening & Zero-Upload Privacy Compliance Audit',
      hsnSac: '998315',
      quantity: 1,
      unitPrice: 12000,
      discountPercent: 0,
    },
  ]);

  // Tax Configuration
  const [taxMode, setTaxMode] = useState<'single' | 'gst' | 'none'>('gst');
  const [taxRate, setTaxRate] = useState<number>(18);
  const [cgstRate, setCgstRate] = useState<number>(9);
  const [sgstRate, setSgstRate] = useState<number>(9);
  const [igstRate, setIgstRate] = useState<number>(18);
  const [isInterState, setIsInterState] = useState<boolean>(false);

  // Fees & Deductions
  const [discountAmount, setDiscountAmount] = useState<number>(1000);
  const [shippingFee, setShippingFee] = useState<number>(0);
  const [notes, setNotes] = useState(
    'Payment due within 30 days. Scan the QR code or use the bank details below for direct transfer. Thank you for your business!'
  );

  // Payment Details & UPI QR
  const [bankDetails, setBankDetails] = useState<BankDetails>({
    bankName: 'HDFC Bank Ltd',
    accountHolder: 'Breathy Tech Studio',
    accountNumber: '50200012345678',
    ifscOrSwift: 'HDFC0001234',
    upiId: 'billing@upi',
  });
  const [showQrCode, setShowQrCode] = useState<boolean>(true);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);

  // Logo
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);

  // Persistence & UI
  const [savedInvoices, setSavedInvoices] = useState<SavedInvoice[]>([]);
  const [banner, setBanner] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonImportRef = useRef<HTMLInputElement>(null);

  // Load saved invoices from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setSavedInvoices(parsed);
      }
    } catch {
      // Ignore
    }
  }, []);

  // Compute Totals
  const subtotal = useMemo(() => {
    return items.reduce((acc, item) => {
      const lineBeforeDiscount = item.quantity * item.unitPrice;
      const discount = item.discountPercent ? (lineBeforeDiscount * item.discountPercent) / 100 : 0;
      return acc + (lineBeforeDiscount - discount);
    }, 0);
  }, [items]);

  const taxableAmount = Math.max(0, subtotal - discountAmount);

  const { taxTotal, cgstAmount, sgstAmount, igstAmount } = useMemo(() => {
    if (taxMode === 'none') {
      return { taxTotal: 0, cgstAmount: 0, sgstAmount: 0, igstAmount: 0 };
    }
    if (taxMode === 'single') {
      const total = (taxableAmount * taxRate) / 100;
      return { taxTotal: total, cgstAmount: 0, sgstAmount: 0, igstAmount: 0 };
    }
    // GST Mode
    if (isInterState) {
      const igst = (taxableAmount * igstRate) / 100;
      return { taxTotal: igst, cgstAmount: 0, sgstAmount: 0, igstAmount: igst };
    } else {
      const cgst = (taxableAmount * cgstRate) / 100;
      const sgst = (taxableAmount * sgstRate) / 100;
      return { taxTotal: cgst + sgst, cgstAmount: cgst, sgstAmount: sgst, igstAmount: 0 };
    }
  }, [taxMode, taxableAmount, taxRate, cgstRate, sgstRate, igstRate, isInterState]);

  const grandTotal = taxableAmount + taxTotal + (Number(shippingFee) || 0);

  const formatMoney = (val: number) => {
    return `${currency.symbol} ${val.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Generate dynamic UPI QR Code whenever payment details or grandTotal changes
  useEffect(() => {
    if (!showQrCode || !bankDetails.upiId.trim() || grandTotal <= 0) {
      setQrCodeDataUrl(null);
      return;
    }

    let cancelled = false;
    const cleanUpiId = bankDetails.upiId.trim();
    const cleanPayee = encodeURIComponent(fromName.trim() || 'Merchant');
    const roundedTotal = grandTotal.toFixed(2);
    const note = encodeURIComponent(`${docType} ${docNumber}`);

    // Standard NPCI UPI URI Scheme
    const upiUri = `upi://pay?pa=${cleanUpiId}&pn=${cleanPayee}&am=${roundedTotal}&cu=${currency.code}&tn=${note}`;

    QRCode.toDataURL(upiUri, {
      width: 220,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => {
        if (!cancelled) setQrCodeDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrCodeDataUrl(null);
      });

    return () => {
      cancelled = true;
    };
  }, [showQrCode, bankDetails.upiId, grandTotal, fromName, docType, docNumber, currency.code]);

  // Handle Logo Upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setLogoDataUrl(reader.result as string);
      setBanner('Logo uploaded and applied to invoice!');
    };
    reader.readAsDataURL(file);
  };

  // Add Item
  const addLineItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        description: 'New Deliverable or Service',
        hsnSac: '998319',
        quantity: 1,
        unitPrice: 1000,
        discountPercent: 0,
      },
    ]);
  };

  const updateItem = (id: string, field: keyof LineItem, value: string | number) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, [field]: value } : it)));
  };

  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  // Save Current Invoice Template
  const saveInvoiceTemplate = () => {
    const entry: SavedInvoice = {
      id: crypto.randomUUID(),
      theme,
      docType,
      docNumber,
      issueDate,
      dueDate,
      currencyCode: currency.code,
      currencySymbol: currency.symbol,
      fromName,
      fromGstin,
      fromDetails,
      toName,
      toGstin,
      toDetails,
      items,
      taxMode,
      taxRate,
      cgstRate,
      sgstRate,
      igstRate,
      isInterState,
      discountAmount,
      shippingFee,
      notes,
      bankDetails,
      showQrCode,
      logoDataUrl,
      savedAt: new Date().toISOString(),
    };
    const next = [entry, ...savedInvoices.filter((i) => i.docNumber !== docNumber).slice(0, 19)];
    setSavedInvoices(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setBanner(`Saved ${docType} #${docNumber} to local invoice studio!`);
  };

  // Load Saved Invoice
  const loadSavedInvoice = (inv: SavedInvoice) => {
    setTheme(inv.theme || 'indigo');
    setDocType(inv.docType);
    setDocNumber(inv.docNumber);
    setIssueDate(inv.issueDate);
    setDueDate(inv.dueDate);
    const foundCurr = CURRENCIES.find((c) => c.code === inv.currencyCode) || CURRENCIES[0];
    setCurrency(foundCurr);
    setFromName(inv.fromName);
    setFromGstin(inv.fromGstin || '');
    setFromDetails(inv.fromDetails);
    setToName(inv.toName);
    setToGstin(inv.toGstin || '');
    setToDetails(inv.toDetails);
    setItems(inv.items);
    setTaxMode(inv.taxMode || 'single');
    setTaxRate(inv.taxRate || 18);
    setCgstRate(inv.cgstRate || 9);
    setSgstRate(inv.sgstRate || 9);
    setIgstRate(inv.igstRate || 18);
    setIsInterState(Boolean(inv.isInterState));
    setDiscountAmount(inv.discountAmount || 0);
    setShippingFee(inv.shippingFee || 0);
    setNotes(inv.notes);
    if (inv.bankDetails) setBankDetails(inv.bankDetails);
    setShowQrCode(Boolean(inv.showQrCode));
    setLogoDataUrl(inv.logoDataUrl || null);
    setBanner(`Loaded ${inv.docType} #${inv.docNumber}!`);
  };

  // Export JSON Backup
  const exportJsonBackup = () => {
    const backupData = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      invoice: {
        theme,
        docType,
        docNumber,
        issueDate,
        dueDate,
        currency,
        fromName,
        fromGstin,
        fromDetails,
        toName,
        toGstin,
        toDetails,
        items,
        taxMode,
        taxRate,
        cgstRate,
        sgstRate,
        igstRate,
        isInterState,
        discountAmount,
        shippingFee,
        notes,
        bankDetails,
        showQrCode,
      },
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Invoice-${docNumber}-backup.json`;
    a.click();
    URL.revokeObjectURL(url);
    setBanner('Exported JSON invoice backup file.');
  };

  // Import JSON Backup
  const handleJsonImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        const data = parsed.invoice || parsed;
        if (data.docNumber) {
          setDocNumber(data.docNumber);
          if (data.docType) setDocType(data.docType);
          if (data.theme) setTheme(data.theme);
          if (data.fromName) setFromName(data.fromName);
          if (data.toName) setToName(data.toName);
          if (Array.isArray(data.items)) setItems(data.items);
          setBanner(`Imported invoice #${data.docNumber} successfully!`);
        }
      } catch {
        setBanner('Failed to parse invoice JSON file.');
      }
    };
    reader.readAsText(file);
  };

  // Print Invoice Directly
  const printInvoice = () => {
    window.print();
  };

  // Export High-Resolution PDF via jsPDF
  const exportPdf = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const currentTheme = THEME_CONFIGS[theme];

    // 1. Header Banner
    doc.setFillColor(currentTheme.rgb[0], currentTheme.rgb[1], currentTheme.rgb[2]);
    doc.rect(0, 0, pageW, 105, 'F');

    // Optional Logo on Header Left
    let headerTextX = 45;
    if (logoDataUrl) {
      try {
        doc.addImage(logoDataUrl, 'PNG', 45, 22, 60, 60);
        headerTextX = 118;
      } catch {
        headerTextX = 45;
      }
    }

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.text(docType, headerTextX, 52);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(`#${docNumber}`, headerTextX, 72);

    doc.setFontSize(9.5);
    doc.text(`Issue Date: ${issueDate}`, pageW - 45, 46, { align: 'right' });
    doc.text(
      docType === 'INVOICE'
        ? `Due Date: ${dueDate}`
        : docType === 'RECEIPT'
        ? `Status: PAID IN FULL`
        : `Estimate Validity: 30 Days`,
      pageW - 45,
      64,
      { align: 'right' }
    );
    if (fromGstin.trim()) {
      doc.text(`GSTIN / Tax ID: ${fromGstin}`, pageW - 45, 82, { align: 'right' });
    }

    // 2. From / To Addresses
    let y = 140;
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('BILLED BY (FROM)', 45, y);
    doc.text(docType === 'INVOICE' ? 'BILLED TO (BUYER)' : 'RECEIVED FROM', 310, y);

    y += 16;
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(11.5);
    doc.text(fromName, 45, y);
    doc.text(toName, 310, y);

    y += 15;
    if (toGstin.trim()) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(79, 70, 229);
      doc.text(`Buyer GSTIN: ${toGstin}`, 310, y);
      y += 13;
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    const fromLines = doc.splitTextToSize(fromDetails, 230);
    const toLines = doc.splitTextToSize(toDetails, 230);
    doc.text(fromLines, 45, y);
    doc.text(toLines, 310, y);

    y += Math.max(fromLines.length, toLines.length) * 13 + 24;

    // 3. Line Items Table Header
    doc.setFillColor(241, 245, 249);
    doc.rect(45, y - 14, pageW - 90, 24, 'F');
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('DESCRIPTION', 55, y + 2);
    doc.text('HSN/SAC', 300, y + 2, { align: 'center' });
    doc.text('QTY', 360, y + 2, { align: 'right' });
    doc.text('RATE', 445, y + 2, { align: 'right' });
    doc.text('AMOUNT', pageW - 55, y + 2, { align: 'right' });

    y += 24;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);

    // Items Loop
    items.forEach((item) => {
      const lineBeforeDiscount = item.quantity * item.unitPrice;
      const discount = item.discountPercent ? (lineBeforeDiscount * item.discountPercent) / 100 : 0;
      const lineTotal = lineBeforeDiscount - discount;

      const descLines = doc.splitTextToSize(item.description, 230);
      doc.setTextColor(15, 23, 42);
      doc.text(descLines, 55, y);
      doc.setTextColor(100, 116, 139);
      doc.text(item.hsnSac || '—', 300, y, { align: 'center' });
      doc.setTextColor(15, 23, 42);
      doc.text(String(item.quantity), 360, y, { align: 'right' });
      doc.text(formatMoney(item.unitPrice), 445, y, { align: 'right' });
      doc.setFont('helvetica', 'bold');
      doc.text(formatMoney(lineTotal), pageW - 55, y, { align: 'right' });
      doc.setFont('helvetica', 'normal');

      const rowHeight = Math.max(1, descLines.length) * 14 + 8;
      doc.setDrawColor(226, 232, 240);
      doc.line(45, y + rowHeight - 8, pageW - 45, y + rowHeight - 8);
      y += rowHeight;
    });

    // 4. Calculations Summary
    y += 12;
    const summaryX = 350;
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105);
    doc.text('Subtotal:', summaryX, y);
    doc.text(formatMoney(subtotal), pageW - 55, y, { align: 'right' });

    if (discountAmount > 0) {
      y += 16;
      doc.text('Discount:', summaryX, y);
      doc.text(`-${formatMoney(discountAmount)}`, pageW - 55, y, { align: 'right' });
    }

    if (taxMode === 'single') {
      y += 16;
      doc.text(`Tax / VAT (${taxRate}%):`, summaryX, y);
      doc.text(formatMoney(taxTotal), pageW - 55, y, { align: 'right' });
    } else if (taxMode === 'gst') {
      if (isInterState) {
        y += 16;
        doc.text(`Integrated GST (IGST ${igstRate}%):`, summaryX, y);
        doc.text(formatMoney(igstAmount), pageW - 55, y, { align: 'right' });
      } else {
        y += 16;
        doc.text(`Central GST (CGST ${cgstRate}%):`, summaryX, y);
        doc.text(formatMoney(cgstAmount), pageW - 55, y, { align: 'right' });
        y += 16;
        doc.text(`State GST (SGST ${sgstRate}%):`, summaryX, y);
        doc.text(formatMoney(sgstAmount), pageW - 55, y, { align: 'right' });
      }
    }

    if (shippingFee > 0) {
      y += 16;
      doc.text('Shipping & Handling:', summaryX, y);
      doc.text(formatMoney(shippingFee), pageW - 55, y, { align: 'right' });
    }

    // Grand Total Box
    y += 22;
    doc.setFillColor(currentTheme.rgb[0], currentTheme.rgb[1], currentTheme.rgb[2]);
    doc.roundedRect(summaryX - 10, y - 14, pageW - summaryX - 35, 26, 4, 4, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text(docType === 'INVOICE' ? 'TOTAL DUE:' : 'TOTAL PAID:', summaryX, y + 3);
    doc.text(formatMoney(grandTotal), pageW - 55, y + 3, { align: 'right' });

    // 5. Payment Details & UPI QR Code Section
    y += 45;
    const paymentY = y;
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('BANK TRANSFER & PAYMENT DETAILS', 45, paymentY);

    y += 15;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text(`Account Name: ${bankDetails.accountHolder}`, 45, y);
    y += 13;
    doc.text(`Bank Name: ${bankDetails.bankName}`, 45, y);
    y += 13;
    doc.text(`Account No: ${bankDetails.accountNumber}`, 45, y);
    y += 13;
    doc.text(`IFSC / SWIFT / IBAN: ${bankDetails.ifscOrSwift}`, 45, y);
    if (bankDetails.upiId.trim()) {
      y += 13;
      doc.text(`UPI VPA: ${bankDetails.upiId}`, 45, y);
    }

    // Embed Dynamic UPI QR Code right beside bank details if enabled
    if (showQrCode && qrCodeDataUrl) {
      try {
        doc.addImage(qrCodeDataUrl, 'PNG', 240, paymentY + 2, 72, 72);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text('Scan with any UPI App', 240, paymentY + 84);
      } catch {
        // Ignore QR embed if failed
      }
    }

    // 6. Notes & Terms
    if (notes.trim()) {
      y += 35;
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('TERMS & CONDITIONS', 45, y);
      y += 13;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.setFontSize(8.5);
      doc.text(doc.splitTextToSize(notes, pageW - 90), 45, y);
    }

    // Clean unbranded footer guarantee
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('Generated with 100% Client-Side Privacy via CommonTool', 45, pageH - 25);

    const outBlob = doc.output('blob');
    const url = URL.createObjectURL(outBlob);
    triggerDownloadWithSuccessPage({
      fileBlobUrl: url,
      fileName: `${docType}-${docNumber}.pdf`,
      fileSize: outBlob.size,
      toolId: 'invoice-generator',
      toolTitle: 'Invoice & Billing Studio',
      customMetricLabel: 'Document Total',
      customMetricValue: formatMoney(grandTotal),
    });
    setBanner(`Exported unbranded PDF: ${docType}-${docNumber}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Studio Top Action Bar */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Receipt className="w-5 h-5 text-indigo-400 shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white">Invoice & Billing Studio</h2>
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Sparkles className="w-3 h-3 shrink-0" />
                  GST + UPI QR + Multicurrency
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Create unbranded invoices, tax receipts, and estimates with instant PDF export.
              </p>
            </div>
            <button
              onClick={() => setShowInfo((v) => !v)}
              aria-label="Toggle studio info"
              className="p-1.5 min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer touch-manipulation"
              title="About this studio"
            >
              <Info className="w-4 h-4 shrink-0" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Switcher on smaller screens */}
            <div className="inline-flex xl:hidden rounded-xl bg-slate-950 p-1 border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('editor')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                  activeTab === 'editor' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5 shrink-0" />
                <span>Editor</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                  activeTab === 'preview' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                }`}
              >
                <Eye className="w-3.5 h-3.5 shrink-0" />
                <span>Preview</span>
              </button>
            </div>

            <button
              type="button"
              onClick={printInvoice}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 min-h-[38px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer touch-manipulation"
              title="Print directly or save as PDF via system dialog"
            >
              <Printer className="w-4 h-4 shrink-0" />
              <span>Print</span>
            </button>

            <button
              type="button"
              onClick={saveInvoiceTemplate}
              className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[38px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer touch-manipulation"
            >
              <Save className="w-4 h-4 shrink-0 text-indigo-400" />
              <span>Save</span>
            </button>

            <button
              type="button"
              onClick={exportPdf}
              className="inline-flex items-center gap-2 px-4 py-2 min-h-[38px] rounded-xl bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-400 hover:to-blue-400 text-white font-bold text-xs shadow-lg shadow-indigo-500/20 cursor-pointer touch-manipulation active:scale-95"
            >
              <Download className="w-4 h-4 shrink-0" />
              <span>Export PDF</span>
            </button>
          </div>
        </div>

        {showInfo && (
          <div className="mt-3 pt-3 border-t border-slate-800 text-xs text-slate-400 space-y-1.5">
            <p>
              CommonTool Invoice & Billing Studio is designed for freelancers, agency owners, contractors, and small businesses worldwide.
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Zero Cloud Uploads:</strong> All calculations, PDF generation, and logos stay 100% on your device.</li>
              <li><strong>Indian GST Engine:</strong> Dual CGST + SGST split or IGST, HSN/SAC code tracking, and GSTIN formatting.</li>
              <li><strong>Dynamic UPI QR Code:</strong> Renders a live NPCI-compliant payment QR code so your clients can scan and pay you immediately with Google Pay, PhonePe, or Paytm.</li>
            </ul>
          </div>
        )}
      </div>

      {banner && (
        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {banner}
          </span>
          <button onClick={() => setBanner(null)} className="text-xs underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Studio Grid: Editor vs Live A4 Canvas */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* LEFT COLUMN: EDIT CONTROLS */}
        <div
          className={`xl:col-span-7 bg-slate-900/50 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-5 ${
            activeTab === 'preview' ? 'hidden xl:block' : 'block'
          }`}
        >
          {/* Section 1: Themes & Metadata */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                Color Theme & Typography
              </span>

              {/* Theme Picker */}
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(THEME_CONFIGS) as InvoiceTheme[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTheme(t)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                      theme === t
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {THEME_CONFIGS[t].name}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Doc Type</label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value as any)}
                  className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white cursor-pointer"
                >
                  <option value="INVOICE">Tax Invoice</option>
                  <option value="RECEIPT">Payment Receipt</option>
                  <option value="PROFORMA">Proforma / Estimate</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Doc Number</label>
                <input
                  type="text"
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Issue Date</label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                />
              </div>
            </div>

            {/* Currency & Logo Picker */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Currency</label>
                <select
                  value={currency.code}
                  onChange={(e) => {
                    const found = CURRENCIES.find((c) => c.code === e.target.value);
                    if (found) setCurrency(found);
                  }}
                  className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white cursor-pointer"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Business Logo</label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 shrink-0" />
                    <span>{logoDataUrl ? 'Replace Logo' : 'Upload Logo'}</span>
                  </button>
                  {logoDataUrl && (
                    <button
                      type="button"
                      onClick={() => setLogoDataUrl(null)}
                      className="px-2.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs cursor-pointer"
                      title="Remove Logo"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Seller & Buyer Profiles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Seller */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2.5">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                From (Your Business)
              </span>
              <input
                type="text"
                placeholder="Business / Freelancer Name"
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
              />
              <input
                type="text"
                placeholder="GSTIN / VAT / Tax ID (optional)"
                value={fromGstin}
                onChange={(e) => setFromGstin(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white font-mono-code"
              />
              <textarea
                rows={3}
                placeholder="Street address, City, State, Country, Email"
                value={fromDetails}
                onChange={(e) => setFromDetails(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white resize-none"
              />
            </div>

            {/* Buyer */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2.5">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                Bill To (Client / Buyer)
              </span>
              <input
                type="text"
                placeholder="Client Name or Company"
                value={toName}
                onChange={(e) => setToName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
              />
              <input
                type="text"
                placeholder="Client GSTIN / Tax ID (optional)"
                value={toGstin}
                onChange={(e) => setToGstin(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white font-mono-code"
              />
              <textarea
                rows={3}
                placeholder="Billing address, City, State, Country, Email"
                value={toDetails}
                onChange={(e) => setToDetails(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white resize-none"
              />
            </div>
          </div>

          {/* Section 3: Line Items */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">Line Items & Deliverables</span>
              <button
                type="button"
                onClick={addLineItem}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {items.map((item, idx) => {
                const lineBefore = item.quantity * item.unitPrice;
                const discount = item.discountPercent ? (lineBefore * item.discountPercent) / 100 : 0;
                const lineTotal = lineBefore - discount;

                return (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-slate-400">#{idx + 1}</span>
                      <input
                        type="text"
                        placeholder="Item or service description"
                        value={item.description}
                        onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white"
                      />
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        disabled={items.length <= 1}
                        className="p-1.5 text-slate-500 hover:text-rose-400 disabled:opacity-30 cursor-pointer"
                        title="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5 shrink-0" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-500">HSN/SAC Code</label>
                        <input
                          type="text"
                          placeholder="e.g. 998314"
                          value={item.hsnSac || ''}
                          onChange={(e) => updateItem(item.id, 'hsnSac', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono-code"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500">Quantity</label>
                        <input
                          type="number"
                          min="0.1"
                          step="any"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500">Rate ({currency.symbol})</label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500">Total</label>
                        <div className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800/60 text-emerald-400 font-bold">
                          {formatMoney(lineTotal)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 4: Taxes & Adjustments */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-3">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Percent className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              Taxes, Discounts & Shipping
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Tax Mode</label>
                <select
                  value={taxMode}
                  onChange={(e) => setTaxMode(e.target.value as any)}
                  className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white cursor-pointer"
                >
                  <option value="gst">Indian GST (CGST+SGST / IGST)</option>
                  <option value="single">Single Tax / VAT (%)</option>
                  <option value="none">Tax Exempt / None (0%)</option>
                </select>
              </div>

              {taxMode === 'single' && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Tax Rate (%)</label>
                  <input
                    type="number"
                    value={taxRate}
                    onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                  />
                </div>
              )}

              {taxMode === 'gst' && (
                <>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">GST Type</label>
                    <select
                      value={isInterState ? 'inter' : 'intra'}
                      onChange={(e) => setIsInterState(e.target.value === 'inter')}
                      className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white cursor-pointer"
                    >
                      <option value="intra">Intra-State (CGST 9% + SGST 9%)</option>
                      <option value="inter">Inter-State (IGST 18%)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      {isInterState ? 'IGST Rate (%)' : 'Split Rate (CGST + SGST)'}
                    </label>
                    {isInterState ? (
                      <input
                        type="number"
                        value={igstRate}
                        onChange={(e) => setIgstRate(parseFloat(e.target.value) || 0)}
                        className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                      />
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="number"
                          placeholder="CGST"
                          value={cgstRate}
                          onChange={(e) => setCgstRate(parseFloat(e.target.value) || 0)}
                          className="w-1/2 px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                        />
                        <input
                          type="number"
                          placeholder="SGST"
                          value={sgstRate}
                          onChange={(e) => setSgstRate(parseFloat(e.target.value) || 0)}
                          className="w-1/2 px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                        />
                      </div>
                    )}
                  </div>
                </>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Discount ({currency.symbol})</label>
                <input
                  type="number"
                  min="0"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Bank Details & UPI QR Code */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <QrCode className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                Payment Methods & Instant UPI QR
              </span>
              <label className="inline-flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showQrCode}
                  onChange={(e) => setShowQrCode(e.target.checked)}
                  className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                />
                <span>Include UPI QR Code</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Account Holder Name</label>
                <input
                  type="text"
                  value={bankDetails.accountHolder}
                  onChange={(e) => setBankDetails({ ...bankDetails, accountHolder: e.target.value })}
                  className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Bank Name</label>
                <input
                  type="text"
                  value={bankDetails.bankName}
                  onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })}
                  className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Account Number</label>
                <input
                  type="text"
                  value={bankDetails.accountNumber}
                  onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
                  className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white font-mono-code"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">IFSC / SWIFT / IBAN</label>
                <input
                  type="text"
                  value={bankDetails.ifscOrSwift}
                  onChange={(e) => setBankDetails({ ...bankDetails, ifscOrSwift: e.target.value })}
                  className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white font-mono-code"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[10px] text-slate-500 mb-1">
                  UPI VPA / ID (e.g. billing@upi, name@okaxis)
                </label>
                <input
                  type="text"
                  placeholder="name@upi"
                  value={bankDetails.upiId}
                  onChange={(e) => setBankDetails({ ...bankDetails, upiId: e.target.value })}
                  className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white font-mono-code"
                />
              </div>
            </div>
          </div>

          {/* Section 6: Terms & Backup Actions */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2.5">
            <span className="text-xs font-bold text-slate-300">Payment Terms & Notes</span>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white resize-none"
            />
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={exportJsonBackup}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs cursor-pointer"
                >
                  <FileJson className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>Backup JSON</span>
                </button>
                <input
                  type="file"
                  ref={jsonImportRef}
                  accept=".json"
                  onChange={handleJsonImport}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => jsonImportRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>Restore JSON</span>
                </button>
              </div>

              {savedInvoices.length > 0 && (
                <span className="text-[11px] text-slate-500">
                  {savedInvoices.length} template(s) in workspace
                </span>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: LIVE A4 PREVIEW CANVAS */}
        <div
          className={`xl:col-span-5 space-y-4 ${
            activeTab === 'editor' ? 'hidden xl:block' : 'block'
          }`}
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between px-2">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              Live A4 Print Preview
            </span>
            <span className="text-[11px] font-mono-code text-slate-500">
              210mm × 297mm • High-Res
            </span>
          </div>

          {/* Paper Canvas */}
          <div className="bg-white text-slate-900 rounded-2xl shadow-2xl p-6 sm:p-8 border border-slate-200 overflow-hidden space-y-6 min-h-[640px] text-[11px] sm:text-xs">
            {/* Header Banner */}
            <div
              className={`-mx-6 sm:-mx-8 -mt-6 sm:-mt-8 p-6 sm:p-8 text-white ${THEME_CONFIGS[theme].bgClass}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  {logoDataUrl && (
                    <img
                      src={logoDataUrl}
                      alt="Logo"
                      className="w-12 h-12 object-contain bg-white rounded-lg p-1 shrink-0"
                    />
                  )}
                  <div>
                    <h1 className="text-xl sm:text-2xl font-black tracking-tight">{docType}</h1>
                    <p className="text-xs opacity-90 font-mono-code">#{docNumber}</p>
                  </div>
                </div>

                <div className="text-right text-[11px] opacity-90 space-y-0.5">
                  <p>Issue Date: {issueDate}</p>
                  <p className="font-semibold">
                    {docType === 'INVOICE'
                      ? `Due Date: ${dueDate}`
                      : docType === 'RECEIPT'
                      ? 'Status: PAID'
                      : 'Valid: 30 Days'}
                  </p>
                  {fromGstin.trim() && <p className="font-mono-code">GSTIN: {fromGstin}</p>}
                </div>
              </div>
            </div>

            {/* From / To Info */}
            <div className="grid grid-cols-2 gap-4 pt-1">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Billed By
                </p>
                <p className="font-bold text-slate-900">{fromName}</p>
                <p className="text-slate-600 whitespace-pre-line leading-relaxed text-[10.5px]">
                  {fromDetails}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  {docType === 'INVOICE' ? 'Billed To' : 'Received From'}
                </p>
                <p className="font-bold text-slate-900">{toName}</p>
                {toGstin.trim() && (
                  <p className="text-indigo-600 font-mono-code text-[10px] font-bold">
                    Buyer GSTIN: {toGstin}
                  </p>
                )}
                <p className="text-slate-600 whitespace-pre-line leading-relaxed text-[10.5px]">
                  {toDetails}
                </p>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b-2 border-slate-200 text-slate-500 text-[10px] uppercase font-bold">
                    <th className="py-2">Description</th>
                    <th className="py-2 text-center">HSN</th>
                    <th className="py-2 text-right">Qty</th>
                    <th className="py-2 text-right">Rate</th>
                    <th className="py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => {
                    const lineBefore = item.quantity * item.unitPrice;
                    const discount = item.discountPercent
                      ? (lineBefore * item.discountPercent) / 100
                      : 0;
                    const lineTotal = lineBefore - discount;
                    return (
                      <tr key={item.id}>
                        <td className="py-2.5 pr-2 font-medium text-slate-800">
                          {item.description}
                        </td>
                        <td className="py-2.5 text-center text-slate-500 font-mono-code text-[10px]">
                          {item.hsnSac || '—'}
                        </td>
                        <td className="py-2.5 text-right text-slate-600">{item.quantity}</td>
                        <td className="py-2.5 text-right text-slate-600">{formatMoney(item.unitPrice)}</td>
                        <td className="py-2.5 text-right font-bold text-slate-900">
                          {formatMoney(lineTotal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Totals Breakdown */}
            <div className="flex justify-end pt-2 border-t border-slate-200">
              <div className="w-64 space-y-1.5 text-right text-[11px]">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-slate-800">{formatMoney(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Discount:</span>
                    <span>-{formatMoney(discountAmount)}</span>
                  </div>
                )}
                {taxMode === 'single' && (
                  <div className="flex justify-between text-slate-600">
                    <span>Tax ({taxRate}%):</span>
                    <span>{formatMoney(taxTotal)}</span>
                  </div>
                )}
                {taxMode === 'gst' && !isInterState && (
                  <>
                    <div className="flex justify-between text-slate-600">
                      <span>CGST ({cgstRate}%):</span>
                      <span>{formatMoney(cgstAmount)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>SGST ({sgstRate}%):</span>
                      <span>{formatMoney(sgstAmount)}</span>
                    </div>
                  </>
                )}
                {taxMode === 'gst' && isInterState && (
                  <div className="flex justify-between text-slate-600">
                    <span>IGST ({igstRate}%):</span>
                    <span>{formatMoney(igstAmount)}</span>
                  </div>
                )}
                {shippingFee > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Shipping:</span>
                    <span>{formatMoney(shippingFee)}</span>
                  </div>
                )}
                <div
                  className={`flex justify-between text-white font-bold p-2 rounded-lg mt-2 ${THEME_CONFIGS[theme].bgClass}`}
                >
                  <span>{docType === 'INVOICE' ? 'Total Due:' : 'Total Paid:'}</span>
                  <span>{formatMoney(grandTotal)}</span>
                </div>
              </div>
            </div>

            {/* Payment Info & UPI QR Display */}
            <div className="pt-4 border-t border-slate-200 flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1 text-slate-600 text-[10.5px]">
                <p className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">
                  Bank & Payment Details
                </p>
                <p>Account: {bankDetails.accountHolder}</p>
                <p>Bank: {bankDetails.bankName}</p>
                <p>Acc No: {bankDetails.accountNumber}</p>
                <p>IFSC / SWIFT: {bankDetails.ifscOrSwift}</p>
                {bankDetails.upiId.trim() && <p>UPI: {bankDetails.upiId}</p>}
              </div>

              {showQrCode && qrCodeDataUrl && (
                <div className="text-center p-2 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                  <img
                    src={qrCodeDataUrl}
                    alt="UPI Payment QR Code"
                    className="w-20 h-20 mx-auto rounded-lg"
                  />
                  <p className="text-[9px] font-bold text-slate-600">Scan & Pay via UPI</p>
                </div>
              )}
            </div>

            {/* Notes */}
            {notes.trim() && (
              <div className="pt-2 text-[10px] text-slate-500 italic border-t border-slate-100">
                <p className="font-bold text-slate-700 not-italic uppercase mb-0.5">Notes:</p>
                <p>{notes}</p>
              </div>
            )}
          </div>

          {/* Saved Templates Quick Access Drawer */}
          {savedInvoices.length > 0 && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-2.5">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                Saved Templates in Workspace
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {savedInvoices.slice(0, 4).map((inv) => (
                  <button
                    key={inv.id}
                    type="button"
                    onClick={() => loadSavedInvoice(inv)}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-left cursor-pointer transition"
                  >
                    <div>
                      <p className="text-xs font-bold text-white">#{inv.docNumber}</p>
                      <p className="text-[10px] text-slate-400 truncate max-w-[140px]">
                        {inv.toName || 'Client'}
                      </p>
                    </div>
                    <span className="text-[10px] font-mono-code text-indigo-400 font-semibold">
                      Load →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
