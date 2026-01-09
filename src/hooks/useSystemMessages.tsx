import { supabase } from '@/integrations/supabase/client';

// System user ID for system messages
const SYSTEM_SENDER_ID = '00000000-0000-0000-0000-000000000000';

export async function sendSystemMessage(chatId: string, content: string, eventData?: Record<string, unknown>) {
  // First ensure the system profile exists
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', SYSTEM_SENDER_ID)
    .maybeSingle();

  if (!existingProfile) {
    // Create system profile if it doesn't exist
    await supabase
      .from('profiles')
      .insert({
        id: SYSTEM_SENDER_ID,
        user_id: SYSTEM_SENDER_ID,
        display_name: 'R@lly Bot',
        avatar_url: null,
      })
      .select()
      .maybeSingle();
  }

  // Send the system message
  const { error } = await supabase
    .from('messages')
    .insert({
      chat_id: chatId,
      sender_id: SYSTEM_SENDER_ID,
      content,
      message_type: 'system',
    });

  if (error) {
    console.error('Failed to send system message:', error);
  }
}

export async function sendJoinMessage(chatId: string, userName: string) {
  await sendSystemMessage(chatId, `🎉 ${userName} joined the rally!`);
}

export async function sendLeaveMessage(chatId: string, userName: string) {
  await sendSystemMessage(chatId, `👋 ${userName} left the rally`);
}

export async function sendGoingHomeMessage(chatId: string, userName: string, destination?: string) {
  const destText = destination ? ` to ${destination}` : '';
  await sendSystemMessage(chatId, `🏠 ${userName} is heading home${destText}`);
}

export async function sendArrivedHomeMessage(chatId: string, userName: string) {
  await sendSystemMessage(chatId, `✅ ${userName} arrived home safely!`);
}

export async function sendNewStopMessage(chatId: string, stopName: string) {
  await sendSystemMessage(chatId, `📍 New stop added: ${stopName}`);
}

export async function sendLocationChangeMessage(chatId: string, newLocation: string) {
  await sendSystemMessage(chatId, `📍 Rally location changed to: ${newLocation}`);
}

export async function sendCohostMessage(chatId: string, cohostName: string) {
  await sendSystemMessage(chatId, `👑 ${cohostName} is now a co-host`);
}

export async function sendMovingToNextStopMessage(chatId: string, currentStop: string, nextStop: string, hostName: string) {
  await sendSystemMessage(chatId, `🍺 ${hostName} says: Time to move! Leaving ${currentStop} → heading to ${nextStop}`);
}

export async function sendArrivedAtStopMessage(chatId: string, stopName: string) {
  await sendSystemMessage(chatId, `🎉 We've arrived at ${stopName}!`);
}
