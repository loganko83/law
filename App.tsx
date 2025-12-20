import React, { useState } from 'react';
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
import { Contract, ViewState, ContractAnalysis, ContractStatus, UserProfile } from './types';
import { MOCK_CONTRACTS, MOCK_ANALYSIS_RESULT, STANDARD_TEMPLATES } from './constants';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('HOME');
  const [contracts, setContracts] = useState<Contract[]>(MOCK_CONTRACTS);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [currentAnalysis, setCurrentAnalysis] = useState<ContractAnalysis>(MOCK_ANALYSIS_RESULT);
  
  // RAG: Centralized User Context
  const [userProfile, setUserProfile] = useState<UserProfile>({
      name: '홍길동',
      email: 'hong@example.com',
      phone: '010-1234-5678',
      businessType: '프리랜서 개발자',
      businessDescription: '스타트업을 대상으로 웹 프론트엔드 및 백엔드 개발 용역을 제공합니다.',
      legalConcerns: '대금 미지급 문제와 과도한 유지보수 요구 방어'
  });

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
  const handleNewAnalysisComplete = () => {
      // In a real app, this would come from the backend response
      setCurrentAnalysis(MOCK_ANALYSIS_RESULT); 
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
                      title: '전자서명 완료 (DocuSign)', 
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
            contracts={contracts} 
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
      default:
        return <div>Not Found</div>;
    }
  };

  // Full screen views without bottom nav
  if (['DETAIL', 'DOCUMENT', 'TEMPLATE_PREVIEW', 'CONTENT_PROOF', 'LEGAL_QA', 'DOCUSIGN_SIGNING'].includes(currentView)) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-slate-50 shadow-2xl">
        {renderContent()}
      </div>
    );
  }

  return (
    <Layout currentView={currentView} onChangeView={handleNavigate}>
      {renderContent()}
    </Layout>
  );
};

export default App;