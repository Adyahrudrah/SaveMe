// types/react-native-get-sms-android.d.ts

declare module 'react-native-get-sms-android' {
    interface SmsMessage {
      _id: string;
      thread_id: string;
      address: string;
      person: string | null;
      date: string;
      date_sent: string | null;
      protocol: string | null;
      read: string;
      status: string | null;
      type: string;
      reply_path_present: string | null;
      body: string;
      service_center: string | null;
      locked: string;
      error_code: string | null;
      seen: string;
    }
  
    interface SmsFilter {
      box: 'inbox' | 'sent' | 'draft' | 'outbox' | 'failed' | 'queued';
      indexFrom?: number;
      maxCount?: number;
    }
  
    const SmsAndroid: {
      list(
        filter: string,
        failureCallback: (error: string) => void,
        successCallback: (count: string, messages: string) => void
      ): void;
    };
  
    export default SmsAndroid;
  }