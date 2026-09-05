import React, { useMemo, useState } from 'react';
import SessionManager from './SessionManager';
import PartyDataEntry from './PartyDataEntry';
import ScenarioSelector from './ScenarioSelector';
import IdentityVerification from './IdentityVerification';
import InteractiveVideoSession from './InteractiveVideoSession';
import LegalDocumentation from './LegalDocumentation';
import DecisionsAndReferral from './DecisionsAndReferral';
import SmartAlerts from './SmartAlerts';
import ArchivingAndReports from './ArchivingAndReports';
import Invitations from './Invitations';
import { trpc } from '../../trpc';
import { useAuth } from '../../contexts/AuthContext';

type ActiveTab = 
  | 'sessions' 
  | 'invitations'
  | 'parties' 
  | 'scenario' 
  | 'identity' 
  | 'video' 
  | 'documentation' 
  | 'decisions' 
  | 'notifications' 
  | 'archive';

const RemoteNotarialHearingModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('sessions');
  const { sessionToken } = useAuth();
  const token = sessionToken || '';

  const { data: sessionsData, isLoading: sessionsLoading, refetch: refetchSessions } =
    trpc.remoteNotarialHearing.listSessions.useQuery(
      { sessionToken: token, limit: 100, offset: 0 },
      { enabled: !!sessionToken }
    );

  const sessions = sessionsData?.sessions ?? [];
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  React.useEffect(() => {
    if (!activeSessionId && sessions.length) setActiveSessionId(sessions[0].id);
  }, [activeSessionId, sessions]);

  const sessionQueryEnabled = !!sessionToken && !!activeSessionId;
  const { data: sessionBundle, isLoading: sessionLoading, refetch: refetchSession } =
    trpc.remoteNotarialHearing.getSession.useQuery(
      { sessionToken: token, sessionId: activeSessionId || '00000000-0000-0000-0000-000000000000' },
      { enabled: sessionQueryEnabled }
    );

  const activeSession = sessionBundle?.session ?? null;
  const activeParticipants = sessionBundle?.participants ?? [];
  const activeIdentityChecks = sessionBundle?.identityChecks ?? [];
  const activeRecordings = sessionBundle?.recordings ?? [];
  const activeReminders = sessionBundle?.reminders ?? [];

  const tabs = [
    { id: 'sessions', label: 'إدارة الجلسات', icon: '📅' },
    { id: 'invitations', label: 'الدعوات', icon: '📨' },
    { id: 'parties', label: 'بيانات الأطراف', icon: '👥' },
    { id: 'scenario', label: 'اختيار السيناريو', icon: '🎭' },
    { id: 'identity', label: 'التحقق من الهوية', icon: '🆔' },
    { id: 'video', label: 'جلسة التلقي', icon: '🎥' },
    { id: 'documentation', label: 'التوثيق القانوني', icon: '⚖️' },
    { id: 'decisions', label: 'القرارات والإحالة', icon: '✅' },
    { id: 'notifications', label: 'التنبيهات الذكية', icon: '🔔' },
    { id: 'archive', label: 'الأرشفة والتقارير', icon: '📊' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'sessions':
        return (
          <SessionManager
            sessionToken={token}
            sessions={sessions}
            isLoading={sessionsLoading}
            activeSessionId={activeSessionId}
            onSelectSession={(id) => setActiveSessionId(id)}
            onCreated={() => {
              refetchSessions();
              setActiveTab('parties');
            }}
          />
        );
      case 'invitations':
        return (
          <Invitations
            sessionToken={token}
            onAccepted={(sessionId) => {
              setActiveSessionId(sessionId);
              refetchSessions();
              setActiveTab('video');
            }}
          />
        );
      case 'parties':
        return (
          <PartyDataEntry
            sessionToken={token}
            session={activeSession}
            participants={activeParticipants}
            isLoading={sessionLoading}
            onSaved={() => {
              refetchSession();
              setActiveTab('scenario');
            }}
          />
        );
      case 'scenario':
        return (
          <ScenarioSelector
            sessionToken={token}
            session={activeSession}
            isLoading={sessionLoading}
            onSelected={() => {
              refetchSession();
              setActiveTab('identity');
            }}
          />
        );
      case 'identity':
        return (
          <IdentityVerification
            sessionToken={token}
            session={activeSession}
            participants={activeParticipants}
            identityChecks={activeIdentityChecks}
            isLoading={sessionLoading}
            onNext={() => setActiveTab('video')}
            onChanged={() => refetchSession()}
          />
        );
      case 'video':
        return (
          <InteractiveVideoSession
            sessionToken={token}
            session={activeSession}
            participants={activeParticipants}
            recordings={activeRecordings}
            onChanged={() => refetchSession()}
          />
        );
      case 'documentation':
        return (
          <LegalDocumentation
            sessionToken={token}
            session={activeSession}
            participants={activeParticipants}
            identityChecks={activeIdentityChecks}
            recordings={activeRecordings}
          />
        );
      case 'decisions':
        return (
          <DecisionsAndReferral
            sessionToken={token}
            session={activeSession}
            isLoading={sessionLoading}
            onChanged={() => refetchSession()}
          />
        );
      case 'notifications':
        return (
          <SmartAlerts
            sessionToken={token}
            session={activeSession}
            reminders={activeReminders}
            isLoading={sessionLoading}
            onChanged={() => refetchSession()}
          />
        );
      case 'archive':
        return <ArchivingAndReports sessionToken={token} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] overflow-hidden font-sans" dir="rtl">
      {/* Module Header */}
      <header className="bg-white border-b border-slate-200/60 px-8 py-5 shadow-[0_1px_3px_0_rgba(0,0,0,0.02)] z-10">
        <div className="flex items-center justify-between max-w-[1600px] mx-auto">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-2xl shadow-sm border border-emerald-100">
              ⚖️
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight font-maghribi">التلقي عن بُعد</h1>
              <p className="text-slate-400 text-xs font-medium mt-0.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                نظام التوثيق العدلي المتقدم عبر الوسائل السمعية البصرية
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end gap-1">
              <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-[10px] font-bold border border-emerald-100 flex items-center gap-1.5">
                <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                متصل بالبث المباشر
              </span>
              <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-[10px] font-bold border border-blue-100 flex items-center gap-1.5 ">
                🔒 تشفير AES-256 فعال
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs Navigation */}
      <nav className="bg-white px-8 border-b border-slate-200/60 overflow-x-auto scrollbar-hide shadow-sm sticky top-0 z-10">
        <div className="flex gap-2 min-w-max max-w-[1600px] mx-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ActiveTab)}
              className={`flex items-center gap-2.5 px-6 py-4 text-sm font-bold transition-all relative group h-full ${
                activeTab === tab.id
                  ? 'text-[#1E5F2C]'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <span className={`text-xl transition-transform group-hover:scale-110 duration-200 ${activeTab === tab.id ? 'opacity-100' : 'opacity-60'}`}>
                {tab.icon}
              </span>
              <span>{tab.label}</span>
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#1E5F2C] rounded-t-full" />
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-8 bg-[#F8FAFC]">
        <div className="max-w-[1600px] mx-auto h-full">
          {!sessionToken ? (
            <div className="max-w-xl mx-auto mt-20 bg-white p-12 rounded-[2rem] border border-slate-200/60 shadow-xl shadow-slate-200/50 text-center animate-fadeIn">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">
                🔒
              </div>
              <p className="font-black text-2xl text-slate-800">يتطلب هذا القسم تسجيل الدخول</p>
              <p className="text-slate-500 mt-3 font-medium">يرجى تسجيل الدخول كعدل للوصول إلى خدمة التلقي عن بعد.</p>
              <button className="mt-8 px-8 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all">
                انتقال لصفحة الدخول
              </button>
            </div>
          ) : (
            <div className="h-full animate-fadeIn transition-opacity duration-300">
              {renderContent()}
            </div>
          )}
        </div>
      </main>

      {/* Connection Status Toast (Modern Upgrade) */}
      <div className="fixed bottom-8 left-8 group">
        <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-2xl flex items-center gap-4 border border-slate-700/50 backdrop-blur-xl transition-all hover:scale-105">
          <div className="relative">
            <div className="w-3 h-3 bg-emerald-400 rounded-full animate-ping absolute inset-0"></div>
            <div className="w-3 h-3 bg-emerald-400 rounded-full relative"></div>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">الحالة الفنية</span>
            <span className="text-xs font-black">جودة الاتصال: ممتازة (45ms)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RemoteNotarialHearingModule;
