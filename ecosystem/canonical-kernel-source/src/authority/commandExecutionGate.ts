import { createHash } from 'node:crypto';
import { CapabilityAuthority, type CapabilityAction, type CapabilityGrant } from './capabilityAuthority';
import { assertCommandLawRequest, type CommandLawSubject } from '../kernel/commandLaw';
import type { AuthorityTransitionRequest } from '../kernel/types';
import type { CanonicalReceipt, KernelAuthorityProxy } from './authorityProxy';

export interface GovernedCommand {
  commandId: string;
  subject: CommandLawSubject;
  action: CapabilityAction;
  resource: string;
  risk: number;
  now: number;
  request: AuthorityTransitionRequest;
}

export interface CommandExecutionReceipt {
  commandId: string;
  authorityReceipt: CanonicalReceipt;
  capabilityId: string;
  resource: string;
  action: CapabilityAction;
  executionResultHash: string;
  executedAt: number;
}

export interface CommandExecutionResult<T> {
  receipt: CommandExecutionReceipt;
  result: T;
}

export interface CommandExecutionGateOptions {
  kernel: KernelAuthorityProxy;
  capabilities: readonly CapabilityGrant[];
}

function hashExecutionResult(value: unknown): string {
  const canonical = typeof value === 'string' ? value : JSON.stringify(value);
  return createHash('sha256').update(canonical ?? 'undefined').digest('hex');
}

/**
 * Canonical execution boundary for governed Cranium Command actions.
 *
 * Capability admission is necessary but never sufficient. The command must
 * also satisfy Command Law and acquire a canonical Kernel authority receipt.
 * The callback is reached only after all preconditions pass.
 */
export class CommandExecutionGate {
  private readonly capabilityAuthority: CapabilityAuthority;
  private readonly kernel: KernelAuthorityProxy;

  constructor(options: CommandExecutionGateOptions) {
    this.kernel = options.kernel;
    this.capabilityAuthority = new CapabilityAuthority(options.capabilities);
  }

  execute<T>(command: GovernedCommand, handler: () => T): CommandExecutionResult<T> {
    assertCommandLawRequest(command.request, command.subject);

    const capability = this.capabilityAuthority.authorize({
      subjectId: command.subject.subjectId,
      action: command.action,
      resource: command.resource,
      risk: command.risk,
      now: command.now,
    });
    if (!capability.allowed || !capability.capabilityId) {
      throw new Error(
        `CRANIUM_COMMAND_LAW: execution denied by capability authority: ${capability.reason}`,
      );
    }

    const authorityReceipt = this.kernel.commit(command.request);
    if (!this.kernel.verifyReceipt(authorityReceipt)) {
      throw new Error('CRANIUM_COMMAND_LAW: canonical authority receipt verification failed');
    }
    if (authorityReceipt.decision !== 'Granted') {
      throw new Error('CRANIUM_COMMAND_LAW: canonical authority receipt denied execution');
    }

    const result = handler();
    const executedAt = command.now;
    const receipt: CommandExecutionReceipt = {
      commandId: command.commandId,
      authorityReceipt,
      capabilityId: capability.capabilityId,
      resource: command.resource,
      action: command.action,
      executionResultHash: hashExecutionResult(result),
      executedAt,
    };
    return { receipt, result };
  }
}
export type ExpectedExecutionBinding = Pick<
  CommandExecutionReceipt,
  'commandId' | 'capabilityId' | 'resource' | 'action' | 'executedAt'
>;

export function verifyExecutionReceipt<T>(
  receipt: CommandExecutionReceipt,
  result: T,
  kernel: KernelAuthorityProxy,
  expected: ExpectedExecutionBinding,
): boolean {
  if (!expected) return false;
  if (receipt.commandId !== expected.commandId
    || receipt.capabilityId !== expected.capabilityId
    || receipt.resource !== expected.resource
    || receipt.action !== expected.action
    || receipt.executedAt !== expected.executedAt) return false;
  if (receipt.authorityReceipt.decision !== 'Granted') return false;
  if (!kernel.verifyReceipt(receipt.authorityReceipt)) return false;
  return receipt.executionResultHash === hashExecutionResult(result);
}

export function denyExecutionWithoutGate(reason: string): never {
  throw new Error(`CRANIUM_COMMAND_LAW: direct execution path denied: ${reason}`);
}
