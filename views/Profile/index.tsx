/**
 * Profile Component
 * Main container that orchestrates all profile subcomponents
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/Toast';

// Hooks
import { useDid, usePayment } from './hooks';

// Components
import { ProfileHeader } from './ProfileHeader';
import { LegalDnaSection } from './LegalDnaSection';
import { DidSection } from './DidSection';
import { ContractHistorySection } from './ContractHistorySection';
import { SettingsSection } from './SettingsSection';
import { EditProfileModal } from './EditProfileModal';
import { RevokeDidModal } from './RevokeDidModal';
import { PaymentModal } from './PaymentModal';

// Types
import { ProfileProps, HISTORY_CONTRACTS, UserProfile } from './types';

export const Profile: React.FC<ProfileProps> = ({
  userProfile,
  onUpdateProfile,
  onBack,
  onLogin,
  onNavigateToBilling,
  onNavigateToDevPortal,
}) => {
  const { t } = useTranslation();
  const { isAuthenticated, logout, updateProfile } = useAuth();
  const { addToast } = useToast();

  // Edit Profile State
  const [isEditProfileOpen, setEditProfileOpen] = useState(false);
  const [editForm, setEditForm] = useState<UserProfile>(userProfile);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // DID Hook
  const {
    didStatus,
    isLoadingDid,
    isIssuingDid,
    isRevokeModalOpen,
    revokeReason,
    setRevokeReason,
    openRevokeModal,
    closeRevokeModal,
    handleIssueDid,
    handleRevokeDid,
    handleCopyDid,
    truncateDidAddress,
  } = useDid(isAuthenticated);

  // Payment Hook
  const {
    savedCards,
    isPaymentModalOpen,
    isAddingCard,
    newCard,
    setNewCard,
    openPaymentModal,
    closePaymentModal,
    startAddingCard,
    cancelAddingCard,
    handleAddCard,
    handleDeleteCard,
  } = usePayment();

  // Categories for stats
  const categories = [
    { id: 'Employment', label: t('contractTypes.Employment'), count: HISTORY_CONTRACTS.filter(c => c.type === 'Employment').length },
    { id: 'Rental', label: t('contractTypes.Rental'), count: HISTORY_CONTRACTS.filter(c => c.type === 'Rental').length },
    { id: 'Sales', label: t('contractTypes.Sales'), count: HISTORY_CONTRACTS.filter(c => c.type === 'Sales').length },
    { id: 'Freelance', label: t('contractTypes.Freelance'), count: HISTORY_CONTRACTS.filter(c => c.type === 'Freelance').length },
  ];

  const handleLogout = () => {
    logout();
    onBack();
  };

  const handleEditProfile = () => {
    setEditForm(userProfile);
    setEditProfileOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!isAuthenticated) {
      onUpdateProfile(editForm);
      setEditProfileOpen(false);
      return;
    }

    setIsSavingProfile(true);
    try {
      await updateProfile({
        business_type: editForm.businessType,
        business_description: editForm.businessDescription,
        legal_concerns: editForm.legalConcerns,
      });

      onUpdateProfile(editForm);
      setEditProfileOpen(false);
      addToast({
        message: t('profile.saveSuccess', 'Profile saved successfully'),
        type: 'success'
      });
    } catch (error) {
      console.error('Failed to save profile:', error);
      addToast({
        message: t('profile.saveError', 'Failed to save profile. Please try again.'),
        type: 'error'
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-24">
      {/* Profile Header */}
      <ProfileHeader
        userProfile={userProfile}
        onEditProfile={handleEditProfile}
      />

      <div className="p-6 space-y-6">
        {/* RAG Context / My Legal DNA Section */}
        <LegalDnaSection
          userProfile={userProfile}
          onEditProfile={handleEditProfile}
        />

        {/* DID Section */}
        {isAuthenticated && (
          <DidSection
            didStatus={didStatus}
            isLoadingDid={isLoadingDid}
            isIssuingDid={isIssuingDid}
            onIssueDid={handleIssueDid}
            onRevokeDid={openRevokeModal}
            onCopyDid={handleCopyDid}
            truncateDidAddress={truncateDidAddress}
          />
        )}

        {/* Contract History Section */}
        <ContractHistorySection categories={categories} />

        {/* Settings Section */}
        <SettingsSection
          isAuthenticated={isAuthenticated}
          onEditProfile={handleEditProfile}
          onNavigateToBilling={onNavigateToBilling}
          onNavigateToDevPortal={onNavigateToDevPortal}
          onLogout={handleLogout}
          onLogin={onLogin}
        />
      </div>

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setEditProfileOpen(false)}
        editForm={editForm}
        setEditForm={setEditForm}
        onSave={handleSaveProfile}
        isSaving={isSavingProfile}
      />

      {/* Revoke DID Modal */}
      <RevokeDidModal
        isOpen={isRevokeModalOpen}
        onClose={closeRevokeModal}
        revokeReason={revokeReason}
        setRevokeReason={setRevokeReason}
        onConfirm={handleRevokeDid}
      />

      {/* Payment Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={closePaymentModal}
        savedCards={savedCards}
        isAddingCard={isAddingCard}
        newCard={newCard}
        setNewCard={setNewCard}
        onStartAddingCard={startAddingCard}
        onCancelAddingCard={cancelAddingCard}
        onAddCard={handleAddCard}
        onDeleteCard={handleDeleteCard}
      />
    </div>
  );
};

export default Profile;
