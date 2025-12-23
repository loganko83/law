/**
 * Verify View
 *
 * Public page for verifying blockchain-anchored documents.
 * Accepts hash parameter from URL or allows user input/file upload.
 */
import React, { useState, useEffect } from "react";
import { Shield, Upload, Check, X, ExternalLink, Copy, AlertCircle, FileText, Hash } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { blockchainApi } from "../services/api";

interface VerifyProps {
  initialHash?: string;
}

interface VerificationResult {
  verified: boolean;
  document_hash: string;
  anchor_id: string | null;
  tx_hash: string | null;
  block_number: number | null;
  anchored_at: string | null;
  network: string;
  message: string;
}

export const Verify: React.FC<VerifyProps> = ({ initialHash }) => {
  const { t } = useTranslation();
  const [documentHash, setDocumentHash] = useState(initialHash || "");
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedTxHash, setCopiedTxHash] = useState(false);

  const XPHERE_EXPLORER_URL = "https://xphere.storydot.kr";

  useEffect(() => {
    if (initialHash) {
      handleVerify(initialHash);
    }
  }, [initialHash]);

  const calculateFileHash = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
    return hashHex;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setVerificationResult(null);

    try {
      const hash = await calculateFileHash(file);
      setDocumentHash(hash);
      await handleVerify(hash);
    } catch (err) {
      setError(t("verify.hashCalculationError"));
    }
  };

  const handleVerify = async (hash?: string) => {
    const hashToVerify = hash || documentHash;

    if (!hashToVerify.trim()) {
      setError(t("verify.hashRequired"));
      return;
    }

    if (!/^[a-fA-F0-9]{64}$/.test(hashToVerify)) {
      setError(t("verify.invalidHashFormat"));
      return;
    }

    setError(null);
    setIsVerifying(true);
    setVerificationResult(null);

    try {
      const result = await blockchainApi.verifyDocument(hashToVerify);
      setVerificationResult(result);
    } catch (err: any) {
      setError(err.message || t("verify.verificationFailed"));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCopyHash = async () => {
    if (verificationResult?.document_hash) {
      await navigator.clipboard.writeText(verificationResult.document_hash);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  const handleCopyTxHash = async () => {
    if (verificationResult?.tx_hash) {
      await navigator.clipboard.writeText(verificationResult.tx_hash);
      setCopiedTxHash(true);
      setTimeout(() => setCopiedTxHash(false), 2000);
    }
  };

  const handleShareVerification = async () => {
    if (verificationResult?.document_hash) {
      const url = `${window.location.origin}${window.location.pathname}?hash=${verificationResult.document_hash}`;
      await navigator.clipboard.writeText(url);
      alert(t("verify.linkCopied"));
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return t("verify.notAvailable");
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
            <Shield className="text-white" size={20} />
          </div>
          <div>
            <h1 className="font-bold text-slate-800 dark:text-slate-100">
              {t("app.name")}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t("verify.title")}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 pt-8">
        {/* Logo Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-blue-200 dark:shadow-blue-900/30">
            <Shield className="text-white" size={36} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
            {t("verify.pageTitle")}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {t("verify.description")}
          </p>
        </motion.div>

        {/* Input Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4 mb-6"
        >
          {/* Hash Input */}
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
              {t("verify.documentHash")}
            </label>
            <div className="relative">
              <Hash
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                type="text"
                value={documentHash}
                onChange={(e) => setDocumentHash(e.target.value)}
                placeholder={t("verify.hashPlaceholder")}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3.5 pl-12 pr-4 text-sm font-mono focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 outline-none transition-all"
                disabled={isVerifying}
              />
            </div>
          </div>

          {/* OR Divider */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
            <span className="text-xs text-slate-400 uppercase font-medium">
              {t("upload.or")}
            </span>
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
          </div>

          {/* File Upload */}
          <div>
            <label className="block w-full">
              <div className="bg-white dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-6 cursor-pointer hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700/50 transition-all">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                    <Upload className="text-blue-600 dark:text-blue-400" size={24} />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {t("verify.uploadFile")}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {t("verify.uploadDescription")}
                    </p>
                  </div>
                </div>
              </div>
              <input
                type="file"
                onChange={handleFileUpload}
                className="hidden"
                disabled={isVerifying}
              />
            </label>
          </div>

          {/* Verify Button */}
          <button
            onClick={() => handleVerify()}
            disabled={isVerifying || !documentHash.trim()}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-4 rounded-xl font-bold text-sm shadow-lg shadow-blue-200 dark:shadow-blue-900/30 hover:shadow-xl hover:from-blue-600 hover:to-indigo-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isVerifying ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>{t("verify.verifying")}</span>
              </>
            ) : (
              <>
                <Shield size={18} />
                <span>{t("verify.verifyButton")}</span>
              </>
            )}
          </button>
        </motion.div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6"
            >
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Verification Result */}
        <AnimatePresence>
          {verificationResult && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-4"
            >
              {/* Status Card */}
              {verificationResult.verified ? (
                <div className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-800 rounded-2xl p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <Check className="text-white" size={28} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-green-800 dark:text-green-300">
                        {t("verify.verified")}
                      </h3>
                      <p className="text-sm text-green-600 dark:text-green-400">
                        {t("verify.verifiedDescription")}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-br from-yellow-50 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/20 border-2 border-yellow-200 dark:border-yellow-800 rounded-2xl p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <X className="text-white" size={28} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-yellow-800 dark:text-yellow-300">
                        {t("verify.notVerified")}
                      </h3>
                      <p className="text-sm text-yellow-600 dark:text-yellow-400">
                        {verificationResult.message}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Details Card */}
              {verificationResult.verified && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-4">
                    <h4 className="font-bold text-white flex items-center gap-2">
                      <FileText size={18} />
                      {t("verify.blockchainDetails")}
                    </h4>
                  </div>

                  <div className="p-4 space-y-4">
                    {/* Document Hash */}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">
                        {t("verify.documentHash")}
                      </label>
                      <div className="flex items-center gap-2">
                        <p className="flex-1 text-sm font-mono bg-slate-50 dark:bg-slate-900 p-3 rounded-lg break-all text-slate-700 dark:text-slate-300">
                          {verificationResult.document_hash}
                        </p>
                        <button
                          onClick={handleCopyHash}
                          className="p-3 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors"
                        >
                          {copiedHash ? <Check size={18} /> : <Copy size={18} />}
                        </button>
                      </div>
                    </div>

                    {/* Network */}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">
                        {t("verify.network")}
                      </label>
                      <p className="text-sm bg-slate-50 dark:bg-slate-900 p-3 rounded-lg text-slate-700 dark:text-slate-300">
                        {verificationResult.network}
                      </p>
                    </div>

                    {/* Transaction Hash */}
                    {verificationResult.tx_hash && (
                      <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">
                          {t("verify.transactionHash")}
                        </label>
                        <div className="flex items-center gap-2">
                          <p className="flex-1 text-sm font-mono bg-slate-50 dark:bg-slate-900 p-3 rounded-lg break-all text-slate-700 dark:text-slate-300">
                            {verificationResult.tx_hash}
                          </p>
                          <button
                            onClick={handleCopyTxHash}
                            className="p-3 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors"
                          >
                            {copiedTxHash ? <Check size={18} /> : <Copy size={18} />}
                          </button>
                        </div>
                        <a
                          href={`${XPHERE_EXPLORER_URL}/tx/${verificationResult.tx_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                        >
                          {t("verify.viewOnExplorer")}
                          <ExternalLink size={14} />
                        </a>
                      </div>
                    )}

                    {/* Block Number */}
                    {verificationResult.block_number && (
                      <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">
                          {t("verify.blockNumber")}
                        </label>
                        <p className="text-sm bg-slate-50 dark:bg-slate-900 p-3 rounded-lg text-slate-700 dark:text-slate-300">
                          {verificationResult.block_number.toLocaleString()}
                        </p>
                      </div>
                    )}

                    {/* Anchored Date */}
                    {verificationResult.anchored_at && (
                      <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">
                          {t("verify.anchoredAt")}
                        </label>
                        <p className="text-sm bg-slate-50 dark:bg-slate-900 p-3 rounded-lg text-slate-700 dark:text-slate-300">
                          {formatDate(verificationResult.anchored_at)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Share Button */}
              {verificationResult.verified && (
                <button
                  onClick={handleShareVerification}
                  className="w-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 py-3.5 rounded-xl font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-all flex items-center justify-center gap-2"
                >
                  <Copy size={18} />
                  <span>{t("verify.shareVerification")}</span>
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Info Box */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4"
        >
          <h4 className="font-bold text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
            <AlertCircle size={16} />
            {t("verify.whatIsThis")}
          </h4>
          <p className="text-sm text-blue-700 dark:text-blue-400 leading-relaxed">
            {t("verify.whatIsThisDescription")}
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Verify;
