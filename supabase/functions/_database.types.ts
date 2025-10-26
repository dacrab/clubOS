// Minimal Database types for Supabase client typing in edge functions
// Only the columns used by our edge functions are modeled here
export type Database = {
	public: {
		Tables: {
			tenants: {
				Row: {
					id: string;
					name: string;
				};
				Insert: {
					id?: string;
					name: string;
				};
				Update: {
					id?: string;
					name?: string;
				};
				Relationships: [];
			};
			users: {
				Row: {
					id: string;
					role: string | null;
					username: string | null;
					active: boolean | null;
				};
				Insert: {
					id?: string;
					role?: string | null;
					username?: string | null;
					active?: boolean | null;
				};
				Update: {
					id?: string;
					role?: string | null;
					username?: string | null;
					active?: boolean | null;
				};
				Relationships: [];
			};
			tenant_members: {
				Row: {
					tenant_id: string;
					user_id: string;
				};
				Insert: {
					tenant_id: string;
					user_id: string;
				};
				Update: {
					tenant_id?: string;
					user_id?: string;
				};
				Relationships: [];
			};
			facilities: {
				Row: {
					id: string;
					tenant_id: string;
					name: string;
				};
				Insert: {
					id?: string;
					tenant_id: string;
					name: string;
				};
				Update: {
					id?: string;
					tenant_id?: string;
					name?: string;
				};
				Relationships: [];
			};
			facility_members: {
				Row: {
					facility_id: string;
					user_id: string;
				};
				Insert: {
					facility_id: string;
					user_id: string;
				};
				Update: {
					facility_id?: string;
					user_id?: string;
				};
				Relationships: [];
			};
		};
		Views: Record<string, never>;
		Functions: Record<string, never>;
		Enums: Record<string, never>;
		CompositeTypes: Record<string, never>;
	};
};
