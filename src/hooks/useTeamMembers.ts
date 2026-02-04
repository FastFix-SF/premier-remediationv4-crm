import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TeamMember {
  user_id: string;
  email: string;
  full_name: string | null; // Maps from 'name' column
  name?: string | null; // Actual column name
  role: string;
  secondary_role?: string | null;
  status: string;
  phone_number?: string | null;
  avatar_url?: string | null;
}

export const useTeamMembers = () => {
  return useQuery({
    queryKey: ['team-members'],
    queryFn: async () => {
      // Fetch team members - use 'name' column (MT schema) instead of 'full_name'
      const { data: teamData, error: teamError } = await supabase
        .from('team_directory')
        .select('user_id, email, name, role, status, phone_number')
        .eq('status', 'active')
        .order('name');

      if (teamError) throw teamError;

      // Fetch profiles with avatars
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, avatar_url');

      // Create a map of user_id to avatar_url
      const avatarMap = new Map(profilesData?.map(p => [p.id, p.avatar_url]) || []);

      // Merge the data and map 'name' to 'full_name' for backward compatibility
      const membersWithAvatars = teamData?.map(member => ({
        ...member,
        full_name: (member as any).name || null, // Map name to full_name
        avatar_url: member.user_id ? avatarMap.get(member.user_id) || null : null,
      })) as TeamMember[];

      return membersWithAvatars;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });
};
