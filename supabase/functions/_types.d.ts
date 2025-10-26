// Minimal typings to make Node's TypeScript server happy for Deno edge code
// Map npm: specifier to installed package types
declare module "npm:@supabase/supabase-js@2" {
	export * from "@supabase/supabase-js";
}

// Minimal Deno globals used by our functions (avoid TS namespaces)
declare const Deno: {
	serve: (handler: (req: Request) => Response | Promise<Response>) => void;
	env: {
		get: (name: string) => string | undefined;
	};
};
