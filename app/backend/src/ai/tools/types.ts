import type { PermissionRole, RiskLevel } from '@backend/security/types/SecurityTypes';

export interface ToolContext {
  readonly sessionId: string;
  readonly role?: PermissionRole;
  /** True when the user already confirmed a risky tool. */
  readonly confirmed?: boolean;
}

export interface ToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly parameters: Record<string, unknown>;
  readonly risk: RiskLevel;
  /** Action id used for the existing PermissionManager policy lookup, if any. */
  readonly policyAction?: string;
  execute(args: Record<string, unknown>, context: ToolContext): Promise<unknown>;
}

export type ToolResultStatus = 'ok' | 'denied' | 'error' | 'awaiting-confirmation' | 'unknown-tool';

export interface ToolResult {
  readonly tool: string;
  readonly status: ToolResultStatus;
  readonly message: string;
  readonly data?: unknown;
}
