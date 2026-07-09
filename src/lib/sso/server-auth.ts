export {
	API_AUTH_EXEMPT_PATHS as API_SSO_AUTH_EXEMPT_PATHS,
	enforceApiAuth as enforceApiSsoAuth,
	isApiRequestPath,
	isExemptFromAuth as isExemptFromSsoAuth,
	validateSsoAuthRequest as validateSsoSessionRequest,
} from "#/lib/auth/server-auth";
