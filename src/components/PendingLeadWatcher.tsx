"use client";

import { useEffect, useState, useRef } from "react";
import { getPendingLeadForUser, acceptLead, escalateLead, getCallers, assignLeadToUser, acceptAndScheduleCall } from "@/app/actions/leadActions";
import { saveFcmToken } from "@/app/actions/authActions";
import { User, Phone, MapPin, Loader2, AlertCircle, Users } from "lucide-react";
import { PushNotifications } from "@capacitor/push-notifications";

export default function PendingLeadWatcher({ userId }: { userId?: string }) {
  const [pendingLead, setPendingLead] = useState<any>(null);
  const [flashing, setFlashing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600);
  const [callers, setCallers] = useState<any[]>([]);
  const [selectedAssignee, setSelectedAssignee] = useState("");

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Initialize Push Notifications
    const initPush = async () => {
      try {
        // Check if we are running inside the custom native Webview (telecrm-android-sync)
        if (typeof window !== 'undefined' && (window as any).AndroidApp) {
          if (userId && (window as any).AndroidApp.setUserId) { (window as any).AndroidApp.setUserId(userId); } const token = (window as any).AndroidApp.getFcmToken();
          if (token) {
            await saveFcmToken(token);
          }
          return; // Skip capacitor setup
        }

        let permStatus = await PushNotifications.checkPermissions();
        if (permStatus.receive === 'prompt') {
          permStatus = await PushNotifications.requestPermissions();
        }
        if (permStatus.receive !== 'granted') return;

        await PushNotifications.createChannel({ id: 'default', name: 'Default', description: 'General Notifications', importance: 5, visibility: 1 });

        await PushNotifications.register();

        PushNotifications.addListener('registration', async (token) => {
          await saveFcmToken(token.value);
        });

        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('Push received: ', notification);
        });
      } catch (e) {
        console.log("Push notifications not supported on web/simulator", e);
      }
    };
    initPush();
  }, []);

  useEffect(() => {
    let pollingTimer: NodeJS.Timeout;

    const checkLead = async () => {
      if (processing) return;
      const lead = await getPendingLeadForUser();
      
      if (lead) {
        setPendingLead(lead);
        const assignedTime = new Date(lead.assignedAt || lead.createdAt).getTime();
        const now = Date.now();
        const diffSecs = Math.floor((now - assignedTime) / 1000);
        setTimeLeft(Math.max(0, 600 - diffSecs));

        // Fetch callers if this is an admin alert
        if (lead.escalationLevel >= 2 && callers.length === 0) {
          const fetchedCallers = await getCallers();
          setCallers(fetchedCallers);
          if (fetchedCallers.length > 0) {
             setSelectedAssignee(fetchedCallers[0].id);
          }
        }
      } else {
        setPendingLead(null); if(audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
      }
    };

    checkLead();
    pollingTimer = setInterval(checkLead, 5000);

    return () => clearInterval(pollingTimer);
  }, [processing, callers.length]);

  useEffect(() => {
    if (!pendingLead) return;

    if (!audioRef.current) {
      audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audioRef.current.loop = false;
    }

    const flashTimer = setInterval(() => {
      setFlashing(f => !f);
      if (audioRef.current) {
        audioRef.current.play().catch(e => {
          console.log("Audio autoplay blocked");
        });
      }
    }, 2000);

    return () => clearInterval(flashTimer);
  }, [pendingLead]);

  useEffect(() => {
    if (!pendingLead) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          if (prev === 1) {
            handleReject(pendingLead.id, true);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [pendingLead]);

  const handleAccept = async () => {
    if (!pendingLead || processing) return;
    setProcessing(true);
    await acceptLead(pendingLead.id);
    setPendingLead(null); if(audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
    setProcessing(false);
  };

  const handleCallIn15 = async () => {
    if (!pendingLead || processing) return;
    setProcessing(true);
    await acceptAndScheduleCall(pendingLead.id, 15);
    setPendingLead(null); if(audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
    setProcessing(false);
  };

  const handleReject = async (id: string, auto: boolean = false) => {
    if (processing) return;
    setProcessing(true);
    await escalateLead(id, !auto);
    setPendingLead(null); if(audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
    setProcessing(false);
  };

  const handleAssign = async () => {
    if (!pendingLead || !selectedAssignee || processing) return;
    setProcessing(true);
    await assignLeadToUser(pendingLead.id, selectedAssignee);
    setPendingLead(null); if(audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
    setProcessing(false);
  };

  if (!pendingLead) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isAdminAlert = pendingLead.escalationLevel >= 2;

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center transition-colors duration-300 backdrop-blur-sm ${flashing ? 'bg-red-500/30' : 'bg-black/40'}`}>
      <div className={`bg-white w-full max-w-xl rounded-2xl shadow-2xl p-8 transform transition-transform duration-200 ${flashing ? 'scale-105' : 'scale-100'}`}>
        
        <div className="flex items-center justify-center mb-6">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center animate-pulse">
            <AlertCircle className="w-8 h-8" />
          </div>
        </div>

        {isAdminAlert ? (
          <>
            <h2 className="text-2xl font-black text-center text-red-600 mb-2">ESCALATION ALERT!</h2>
            <p className="text-center text-red-500 font-bold mb-6">
              This lead was ignored/rejected by ALL sales people! Please re-assign it.
            </p>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-black text-center text-gray-900 mb-2">NEW LEAD ASSIGNED!</h2>
            <p className="text-center text-gray-600 mb-6 font-medium">
              You must accept or reject this lead to continue working.
            </p>
          </>
        )}

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
             <div>
               <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Lead Name</div>
               <div className="text-xl font-bold text-gray-900 flex items-center">
                 <User className="w-5 h-5 mr-2 text-[#4f46e5]" />
                 {pendingLead.name}
               </div>
             </div>
             <div className="text-right">
               <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Source</div>
               <div className="inline-block bg-purple-100 text-purple-800 text-xs font-bold px-2.5 py-1 rounded-full">
                 {pendingLead.source}
               </div>
             </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200">
             <div>
               <div className="text-xs font-medium text-gray-500 mb-1 flex items-center">
                 <Phone className="w-3 h-3 mr-1" /> Phone
               </div>
               <div className="text-sm font-semibold text-gray-800">
                 {pendingLead.phone}
               </div>
             </div>
             <div>
               <div className="text-xs font-medium text-gray-500 mb-1 flex items-center">
                 <MapPin className="w-3 h-3 mr-1" /> City
               </div>
               <div className="text-sm font-semibold text-gray-800">
                 {pendingLead.city || 'Unknown'}
               </div>
             </div>
          </div>
        </div>

        <div className="flex flex-col space-y-4">
          <div className="text-center font-bold text-red-600 tabular-nums text-lg mb-2">
            Time Remaining: {minutes}:{seconds.toString().padStart(2, '0')}
          </div>
          
          {isAdminAlert && callers.length > 0 ? (
            <div className="flex items-center space-x-3 mb-4 p-4 border border-purple-100 rounded-lg bg-purple-50">
              <Users className="w-5 h-5 text-[#4f46e5]" />
              <select 
                value={selectedAssignee}
                onChange={(e) => setSelectedAssignee(e.target.value)}
                className="flex-1 bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-[#4f46e5] focus:border-[#4f46e5] block p-2.5"
              >
                {callers.map(caller => (
                  <option key={caller.id} value={caller.id}>{caller.name}</option>
                ))}
              </select>
              <button 
                onClick={handleAssign}
                disabled={processing}
                className="bg-[#4f46e5] hover:bg-purple-800 text-white font-bold py-2.5 px-4 md:px-6 rounded-lg transition-colors disabled:opacity-50"
              >
                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Assign'}
              </button>
            </div>
          ) : null}

            <div className="grid grid-cols-3 gap-3">
              <button 
                onClick={() => handleReject(pendingLead.id)}
                disabled={processing}
                className="col-span-1 bg-red-50 hover:bg-red-100 text-red-600 font-bold py-3 rounded-xl transition-colors disabled:opacity-50 text-xs sm:text-sm border border-red-200"
              >
                {processing ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'PASS'}
              </button>
              <button 
                onClick={handleCallIn15}
                disabled={processing}
                className="col-span-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-500/30 transition-colors disabled:opacity-50 text-xs sm:text-sm"
              >
                {processing ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'SNOOZE'}
              </button>
              <button 
                onClick={() => {
                  handleAccept();
                  window.location.href = `tel:${pendingLead.phone}`;
                }}
                disabled={processing}
                className="col-span-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-green-500/30 transition-colors disabled:opacity-50 text-xs sm:text-sm"
              >
                {processing ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'CALL'}
              </button>
            </div>
        </div>

      </div>
    </div>
  );
}
