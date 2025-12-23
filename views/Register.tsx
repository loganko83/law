/**
 * Register View
 *
 * Provides user registration with email, password, and optional name.
 */
import React, { useState } from "react";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  UserPlus,
  AlertCircle,
  Check,
  User,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";

interface RegisterProps {
  onBack: () => void;
  onLogin: () => void;
  onSuccess: () => void;
}

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
}

export const Register: React.FC<RegisterProps> = ({ onBack, onLogin, onSuccess }) => {
  const { t } = useTranslation();
  const { register, isLoading, error, clearError } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const getPasswordStrength = (password: string): PasswordStrength => {
    let score = 0;

    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) {
      return { score: 1, label: t("auth.passwordWeak"), color: "bg-red-500" };
    } else if (score <= 4) {
      return { score: 2, label: t("auth.passwordMedium"), color: "bg-yellow-500" };
    } else {
      return { score: 3, label: t("auth.passwordStrong"), color: "bg-green-500" };
    }
  };

  const passwordStrength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLocalError(null);

    // Validation
    if (!email.trim()) {
      setLocalError(t("auth.emailRequired"));
      return;
    }

    if (!validateEmail(email)) {
      setLocalError(t("auth.invalidEmail"));
      return;
    }

    if (!password) {
      setLocalError(t("auth.passwordRequired"));
      return;
    }

    if (password.length < 8) {
      setLocalError(t("auth.passwordMinLength"));
      return;
    }

    if (password !== confirmPassword) {
      setLocalError(t("auth.passwordMismatch"));
      return;
    }

    if (!agreedToTerms) {
      setLocalError(t("auth.termsRequired"));
      return;
    }

    try {
      await register(email, password, name.trim() || undefined);
      onSuccess();
    } catch {
      // Error is handled by AuthContext
    }
  };

  const displayError = localError || error;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 px-4 py-3 flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 -ml-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-bold text-slate-800 dark:text-slate-100">
          {t("auth.register")}
        </h1>
      </div>

      {/* Content */}
      <div className="p-6 pt-8 pb-24">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mx-auto mb-3 flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30">
            <UserPlus className="text-white" size={28} />
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1">
            {t("auth.createAccount")}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {t("auth.registerDescription")}
          </p>
        </motion.div>

        {/* Error Message */}
        <AnimatePresence>
          {displayError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4"
            >
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
                <p className="text-sm text-red-700 dark:text-red-400">{displayError}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Register Form */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          {/* Name Input (Optional) */}
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
              {t("auth.name")} <span className="text-slate-400 font-normal">({t("auth.optional")})</span>
            </label>
            <div className="relative">
              <User
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("auth.namePlaceholder")}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3.5 pl-12 pr-4 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900 outline-none transition-all"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Email Input */}
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
              {t("auth.email")} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setLocalError(null);
                }}
                placeholder={t("auth.emailPlaceholder")}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3.5 pl-12 pr-4 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900 outline-none transition-all"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
              {t("auth.password")} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Lock
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setLocalError(null);
                }}
                placeholder={t("auth.passwordPlaceholder")}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3.5 pl-12 pr-12 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900 outline-none transition-all"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Password Strength Indicator */}
            {password && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-2"
              >
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${passwordStrength.color} transition-all duration-300`}
                      style={{ width: `${(passwordStrength.score / 3) * 100}%` }}
                    />
                  </div>
                  <span className={`text-xs font-medium ${
                    passwordStrength.score === 1 ? "text-red-500" :
                    passwordStrength.score === 2 ? "text-yellow-600" :
                    "text-green-600"
                  }`}>
                    {passwordStrength.label}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  {t("auth.passwordHint")}
                </p>
              </motion.div>
            )}
          </div>

          {/* Confirm Password Input */}
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
              {t("auth.confirmPassword")} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Lock
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setLocalError(null);
                }}
                placeholder={t("auth.confirmPasswordPlaceholder")}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3.5 pl-12 pr-12 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900 outline-none transition-all"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Password Match Indicator */}
            {confirmPassword && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-2 flex items-center gap-1.5"
              >
                {password === confirmPassword ? (
                  <>
                    <Check size={14} className="text-green-500" />
                    <span className="text-xs text-green-600">{t("auth.passwordMatch")}</span>
                  </>
                ) : (
                  <>
                    <AlertCircle size={14} className="text-red-500" />
                    <span className="text-xs text-red-500">{t("auth.passwordMismatch")}</span>
                  </>
                )}
              </motion.div>
            )}
          </div>

          {/* Terms Checkbox */}
          <div className="pt-2">
            <label className="flex items-start gap-3 cursor-pointer">
              <div className="relative mt-0.5">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => {
                    setAgreedToTerms(e.target.checked);
                    setLocalError(null);
                  }}
                  className="sr-only"
                  disabled={isLoading}
                />
                <div
                  className={`w-5 h-5 rounded-md border-2 transition-all ${
                    agreedToTerms
                      ? "bg-indigo-600 border-indigo-600"
                      : "border-slate-300 dark:border-slate-600"
                  }`}
                >
                  {agreedToTerms && (
                    <Check className="text-white" size={16} />
                  )}
                </div>
              </div>
              <span className="text-sm text-slate-600 dark:text-slate-400 leading-tight">
                {t("auth.termsAgreement")}
                <button
                  type="button"
                  className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline ml-1"
                >
                  {t("auth.termsLink")}
                </button>
                {t("auth.andText")}
                <button
                  type="button"
                  className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline ml-1"
                >
                  {t("auth.privacyLink")}
                </button>
                {t("auth.agreeSuffix")}
              </span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-4 rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30 hover:shadow-xl hover:from-indigo-600 hover:to-purple-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>{t("auth.registering")}</span>
              </>
            ) : (
              <>
                <UserPlus size={18} />
                <span>{t("auth.registerButton")}</span>
              </>
            )}
          </button>
        </motion.form>

        {/* Divider */}
        <div className="flex items-center gap-4 my-8">
          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
          <span className="text-xs text-slate-400 uppercase font-medium">
            {t("auth.or")}
          </span>
          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
        </div>

        {/* Login Link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center"
        >
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-3">
            {t("auth.hasAccount")}
          </p>
          <button
            onClick={onLogin}
            className="w-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 py-3.5 rounded-xl font-bold text-sm hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-700 transition-all"
          >
            {t("auth.loginButton")}
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default Register;
