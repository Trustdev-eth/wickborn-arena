				import worker, * as OTHER_EXPORTS from "/home/ubuntu/ohio/wickborn/wickborn-arena/services/realtime/worker.js";
				import * as __MIDDLEWARE_0__ from "/home/ubuntu/ohio/wickborn/wickborn-arena/node_modules/.pnpm/wrangler@4.92.0_@cloudflare+workers-types@4.20260515.1_@types+node@22.19.19/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts";
import * as __MIDDLEWARE_1__ from "/home/ubuntu/ohio/wickborn/wickborn-arena/node_modules/.pnpm/wrangler@4.92.0_@cloudflare+workers-types@4.20260515.1_@types+node@22.19.19/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts";

				export * from "/home/ubuntu/ohio/wickborn/wickborn-arena/services/realtime/worker.js";
				const MIDDLEWARE_TEST_INJECT = "__INJECT_FOR_TESTING_WRANGLER_MIDDLEWARE__";
				export const __INTERNAL_WRANGLER_MIDDLEWARE__ = [
					
					__MIDDLEWARE_0__.default,__MIDDLEWARE_1__.default
				]
				export default worker;