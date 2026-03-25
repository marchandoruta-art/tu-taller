import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { supabase } from '@/integrations/supabase/client';
import { VehicleMessage } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface VehicleChatProps {
  vehicleId: string;
}

export function VehicleChat({ vehicleId }: VehicleChatProps) {
  const { user, profile } = useAuth();
  const { organizationId } = useOrganization();
  const [messages, setMessages] = useState<VehicleMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`vehicle-messages-${vehicleId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'vehicle_messages',
          filter: `vehicle_id=eq.${vehicleId}`,
        },
        async (payload) => {
          // Fetch the full message with profile
          const { data: messageData } = await supabase
            .from('vehicle_messages')
            .select('*')
            .eq('id', payload.new.id)
            .single();

          if (messageData) {
            // Fetch the profile separately
            const { data: profileData } = await supabase
              .from('profiles')
              .select('full_name, avatar_url')
              .eq('user_id', messageData.user_id)
              .maybeSingle();

            const messageWithProfile = {
              ...messageData,
              profile: profileData
            };
            setMessages((prev) => [...prev, messageWithProfile as VehicleMessage]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [vehicleId]);

  useEffect(() => {
    // Scroll within the chat container only, not the whole page
    if (messagesEndRef.current) {
      const chatContainer = messagesEndRef.current.closest('.overflow-y-auto');
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }
  }, [messages]);

  const fetchMessages = async () => {
    setLoading(true);
    const { data: messagesData, error } = await supabase
      .from('vehicle_messages')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      setLoading(false);
      return;
    }

    if (messagesData && messagesData.length > 0) {
      // Fetch profiles for all unique user_ids
      const userIds = [...new Set(messagesData.map(m => m.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', userIds);

      const profilesMap = new Map(
        profilesData?.map(p => [p.user_id, { full_name: p.full_name, avatar_url: p.avatar_url }]) || []
      );

      const messagesWithProfiles = messagesData.map(msg => ({
        ...msg,
        profile: profilesMap.get(msg.user_id) || null
      }));

      setMessages(messagesWithProfiles as VehicleMessage[]);
    } else {
      setMessages([]);
    }
    setLoading(false);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    setSending(true);
    const { error } = await supabase.from('vehicle_messages').insert([
      {
        vehicle_id: vehicleId,
        user_id: user.id,
        message: newMessage.trim(),
        organization_id: organizationId,
      },
    ]);

    if (!error) {
      setNewMessage('');
    }
    setSending(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[400px] bg-card rounded-xl border border-border overflow-hidden">
      <div className="p-3 border-b border-border">
        <h3 className="font-medium">Chat del Vehículo</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-8">
            No hay mensajes aún. ¡Inicia la conversación!
          </p>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.user_id === user?.id;
            const profileData = msg.profile;

            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}
              >
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {profileData?.full_name ? getInitials(profileData.full_name) : '??'}
                  </AvatarFallback>
                </Avatar>
                <div className={`max-w-[70%] ${isOwn ? 'text-right' : ''}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium">
                      {profileData?.full_name || 'Usuario'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(msg.created_at), 'HH:mm', { locale: es })}
                    </span>
                  </div>
                  <div
                    className={`inline-block px-3 py-2 rounded-xl text-sm ${
                      isOwn
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    {msg.message}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="p-3 border-t border-border flex gap-2">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Escribe un mensaje..."
          disabled={sending}
        />
        <Button type="submit" size="icon" disabled={sending || !newMessage.trim()}>
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  );
}
