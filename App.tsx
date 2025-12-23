import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Layout } from './components/Layout';
import { Home } from './views/Home';
import { Upload } from './views/Upload';
import { Report } from './views/Report';
import { ContractDetail } from './views/ContractDetail';
import { DocumentView } from './views/DocumentView';
import { TemplatePreview } from './views/TemplatePreview';
import { Profile } from './views/Profile';
import { LegalServices } from './views/LegalServices';
import { ContentProofGenerator } from './views/ContentProofGenerator';
import { LegalQA } from './views/LegalQA';
import { DocuSignSigning } from './views/DocuSignSigning';
import { Login } from './views/Login';
import { Register } from './views/Register';
import { Verify } from './views/Verify';
import { Billing } from './views/Billing';
import { DeveloperPortal } from './views/DeveloperPortal';
import { Contract, ViewState, ContractAnalysis, ContractStatus, UserProfile } from './types';
import { MOCK_CONTRACTS, MOCK_ANALYSIS_RESULT, STANDARD_TEMPLATES } from './constants';
import { ToastProvider } from './components/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { OfflineIndicator } from './components/OfflineIndicator';

// Inner App component that uses auth context
const AppContent: React.FC = () => {
  const { t } = useTranslation();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const [currentView, setCurrentView] = useState<ViewState>('HOME');
  const [contracts, setContracts] = useState<Contract[]>(MOCK_CONTRACTS);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [currentAnalysis, setCurrentAnalysis] = useState<ContractAnalysis>(MOCK_ANALYSIS_RESULT);

  // RAG: Centralized User Context - sync with auth user when available
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: t('defaults.userName'),
    email: t('defaults.userEmail'),
    phone: t('defaults.userPhone'),
    businessType: t('defaults.businessType'),
    businessDescription: t('defaults.businessDescription'),
    legalConcerns: t('defaults.legalConcerns')
  });

  // Sync user profile with authenticated user data
  useEffect(() => {
    if (user) {
      setUserProfile(prev => ({
        ...prev,
        name: user.name || prev.name,
        email: user.email,
        phone: user.phone || prev.phone,
      }));
    }
  }, [user]);

  // Handlers
  const handleNavigate = (view: ViewState) => {
    setCurrentView(view);
    window.scrollTo(0, 0);
  };

  const handleContractClick = (contract: Contract) => {
    setSelectedContract(contract);
    setCurrentView('DETAIL');
  };

  const handleTemplateClick = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setCurrentView('TEMPLATE_PREVIEW');
  };

  const handleAnalysisDone = () => {
    setCurrentView('HOME');
  };

  // Called when user clicks "View Report" from Contract Detail
  const handleViewReport = (analysis: ContractAnalysis) => {
      setCurrentAnalysis(analysis);
      setCurrentView('REPORT');
  };

  // Called when a new file is uploaded and analyzed
  const handleNewAnalysisComplete = (analysis: ContractAnalysis, contractText: string) => {
      setCurrentAnalysis(analysis);

      // Create a new contract entry with the analysis
      const newContract: Contract = {
        id: `analyzed_${Date.now()}`,
        title: 'Uploaded Contract',
        type: 'Service',
        partyName: 'Analysis Result',
        status: ContractStatus.Reviewing,
        date: new Date().toISOString().split('T')[0],
        content: contractText,
        analysis: analysis,
        timeline: [
          {
            date: new Date().toISOString().split('T')[0],
            title: 'AI Analysis Completed',
            completed: true,
            notes: `Safety Score: ${analysis.score}/100`
          }
        ]
      };

      setContracts(prev => [newContract, ...prev]);
      handleNavigate('REPORT');
  };

  // DocuSign Handlers
  const handleStartDocuSign = () => {
      handleNavigate('DOCUSIGN_SIGNING');
  };

  const handleDocuSignComplete = () => {
      if (selectedContract) {
          // Update contract status to Active/Signed
          const updatedContract = { 
              ...selectedContract, 
              status: ContractStatus.Active,
              timeline: [
                  ...(selectedContract.timeline || []),
                  {
                      date: new Date().toISOString().split('T')[0],
                      title: t('timeline.signatureComplete'),
                      completed: true,
                      notes: 'DocuSign ID: ' + Math.random().toString(36).substr(2, 8).toUpperCase(),
                      documents: ['signed_contract.pdf']
                  }
              ]
          };
          
          // Update local state lists
          setContracts(prev => prev.map(c => c.id === selectedContract.id ? updatedContract : c));
          setSelectedContract(updatedContract);
      }
      handleNavigate('DETAIL');
  };

  // Render Logic
  const renderContent = () => {
    switch (currentView) {
      case 'HOME':
        return (
          <Home
            onContractClick={handleContractClick}
            onNewCheck={() => handleNavigate('UPLOAD')}
            onTemplateClick={handleTemplateClick}
          />
        );
      case 'UPLOAD':
      case 'ANALYSIS_LOADING':
        return (
          <Upload
            onAnalyze={handleNewAnalysisComplete}
            onCancel={() => handleNavigate('HOME')}
            userProfile={userProfile}
          />
        );
      case 'REPORT':
        return (
          <Report 
            analysis={currentAnalysis} 
            onDone={handleAnalysisDone} 
          />
        );
      case 'DETAIL':
        if (!selectedContract) return null;
        return (
          <ContractDetail 
            contract={selectedContract} 
            onBack={() => handleNavigate('HOME')} 
            onViewDocument={() => handleNavigate('DOCUMENT')}
            onViewReport={handleViewReport}
            onStartSign={handleStartDocuSign} 
          />
        );
      case 'DOCUMENT':
        if (!selectedContract) return null;
        return (
          <DocumentView 
            contract={selectedContract} 
            userProfile={userProfile} // Inject RAG Context
            onBack={() => handleNavigate('DETAIL')}
          />
        );
      case 'TEMPLATE_PREVIEW':
        if (!selectedTemplateId) return null;
        return (
          <TemplatePreview 
            templateId={selectedTemplateId}
            onBack={() => handleNavigate('HOME')}
            onUseTemplate={(content) => {
                const template = STANDARD_TEMPLATES[selectedTemplateId];
                
                // Map template ID to Contract Type
                let type: Contract['type'] = 'Service'; 
                if (selectedTemplateId === 'freelance') type = 'Freelance';
                else if (selectedTemplateId === 'rental') type = 'Rental';
                else if (selectedTemplateId === 'labor') type = 'Employment';
                else if (selectedTemplateId === 'nda') type = 'Service';
                else if (['mou', 'loi', 'moa'].includes(selectedTemplateId)) type = 'Business';
                else if (['investment', 'spa'].includes(selectedTemplateId)) type = 'Investment';

                const newContract: Contract = {
                    id: `new_${Date.now()}`,
                    title: template.title,
                    type: type,
                    partyName: '(작성 예정)',
                    status: ContractStatus.Draft,
                    date: new Date().toISOString().split('T')[0],
                    content: content,
                    timeline: [
                        { date: new Date().toISOString().split('T')[0], title: '계약서 초안 작성', completed: true, notes: '템플릿 기반 작성' }
                    ]
                };

                setContracts(prev => [newContract, ...prev]);
                setSelectedContract(newContract);
                setCurrentView('DETAIL');
            }}
          />
        );
      case 'PROFILE':
        return (
            <Profile
                userProfile={userProfile}
                onUpdateProfile={setUserProfile}
                onBack={() => handleNavigate('HOME')}
                onLogin={() => handleNavigate('LOGIN')}
                onNavigateToBilling={() => handleNavigate('BILLING')}
                onNavigateToDevPortal={() => handleNavigate('DEVELOPER_PORTAL')}
            />
        );
      case 'LEGAL_SERVICES':
        return (
            <LegalServices onNavigate={handleNavigate} />
        );
      case 'CONTENT_PROOF':
        return (
            <ContentProofGenerator 
                userProfile={userProfile} // Inject RAG Context
                onBack={() => handleNavigate('LEGAL_SERVICES')} 
            />
        );
      case 'LEGAL_QA':
        return (
            <LegalQA 
                userProfile={userProfile} // Inject RAG Context
                onBack={() => handleNavigate('LEGAL_SERVICES')} 
            />
        );
      case 'DOCUSIGN_SIGNING':
          if (!selectedContract) return null;
          return (
              <DocuSignSigning
                contract={selectedContract}
                onSigned={handleDocuSignComplete}
                onCancel={() => handleNavigate('DETAIL')}
              />
          );
      case 'LOGIN':
          return (
              <Login
                onBack={() => handleNavigate('HOME')}
                onRegister={() => handleNavigate('REGISTER')}
                onSuccess={() => handleNavigate('HOME')}
              />
          );
      case 'REGISTER':
          return (
              <Register
                onBack={() => handleNavigate('LOGIN')}
                onLogin={() => handleNavigate('LOGIN')}
                onSuccess={() => handleNavigate('HOME')}
              />
          );
      case 'VERIFY':
          const urlParams = new URLSearchParams(window.location.search);
          const hashParam = urlParams.get('hash');
          return (
              <Verify initialHash={hashParam || undefined} />
          );
      case 'BILLING':
          return (
              <Billing onBack={() => handleNavigate('PROFILE')} />
          );
      case 'DEVELOPER_PORTAL':
          return (
              <DeveloperPortal onBack={() => handleNavigate('PROFILE')} />
          );
      default:
        return <div>Not Found</div>;
    }
  };

  // Show loading spinner while checking auth
  if (authLoading) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  // Full screen views without bottom nav
  const fullScreenViews = [
    'DETAIL',
    'DOCUMENT',
    'TEMPLATE_PREVIEW',
    'CONTENT_PROOF',
    'LEGAL_QA',
    'DOCUSIGN_SIGNING',
    'LOGIN',
    'REGISTER',
    'VERIFY',
    'BILLING',
    'DEVELOPER_PORTAL'
  ];

  if (fullScreenViews.includes(currentView)) {
    return (
      <>
        <OfflineIndicator />
        <div className="max-w-md mx-auto min-h-screen bg-slate-50 dark:bg-slate-900 shadow-2xl transition-colors">
          {renderContent()}
        </div>
      </>
    );
  }

  return (
    <>
      <OfflineIndicator />
      <Layout currentView={currentView} onChangeView={handleNavigate}>
        {renderContent()}
      </Layout>
    </>
  );
};

// Main App wrapper with providers
const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <AppContent />
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;