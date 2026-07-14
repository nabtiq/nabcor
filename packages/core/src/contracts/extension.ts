/**
 * The extension contract — INTERFACE ONLY. There is deliberately no loader,
 * registry, runtime, or working extension in nabcor.
 *
 * Why the socket exists but the plug does not:
 *   WordPress's real failure mode is not "plugins exist" — it is the execution
 *   model. Every plugin runs in one shared PHP process with one shared
 *   permission set, so any plugin can read/write anything. We refuse to ship
 *   that. We reserve a typed, capability-scoped socket here so the shape is
 *   decided up front, and we defer the runtime until we can answer the three
 *   isolation questions recorded in docs/deferred-decisions.md.
 *
 * Nothing in nabcor imports this at runtime. It is a promise about a future
 * shape, kept as types so that when we do build the runtime it must conform.
 */
import type { Section, SiteContent } from '../schema/content';

/**
 * A capability an extension must declare up front. Least-privilege: an
 * extension receives only what it lists. There is no ambient "read anything".
 */
export type Capability =
  | 'read:content' // read the resolved SiteContent
  | 'read:tokens' // read the active theme's design tokens
  | 'inject:head' // contribute tags to <head> (e.g. analytics)
  | 'inject:section' // contribute a rendered section
  | 'extend:schema'; // add new section/content types

/**
 * Hook points an extension MAY implement. Every hook is pure and
 * build-time-oriented by intent — the isolation model that would permit
 * anything else is an open question (see deferred-decisions.md).
 */
export interface ExtensionHooks {
  /** Transform content before render. Must be pure. */
  transformContent: (content: SiteContent) => SiteContent;
  /** Return extra <head> nodes as serialized strings. */
  contributeHead: (content: SiteContent) => string[];
  /** Return extra sections to append. */
  contributeSections: (content: SiteContent) => Section[];
}

export interface NabcorExtension {
  id: string;
  /** Explicit, least-privilege, declared up front. */
  capabilities: Capability[];
  hooks: Partial<ExtensionHooks>;
}

/*
 * INTENTIONALLY ABSENT (see docs/deferred-decisions.md):
 *   - loadExtensions()      — how they register
 *   - ExtensionRegistry     — where they live
 *   - any sandbox/isolation — what grants trust (container? WASM? build-only?)
 * Do not add these without answering the three questions in that doc.
 */
