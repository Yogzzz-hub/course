import { describe, expect, it } from 'vitest';
import { actions, can, requirePermission, roles, ForbiddenError, UnauthenticatedError } from '../src/admin-console/permissions';
import { isIndexable, isPrivate, pageMeta, robotsTxt, sitemapPaths } from '../src/seo';
import { landingPages } from '../src/data/landingPages';
import { routes } from '../src/data/routes';

describe('role permissions', () => {
  it('gives owners and administrators everything and limits other roles', () => {
    for (const action of actions) { expect(can('owner', action)).toBe(true); expect(can('administrator', action)).toBe(true); }
    expect(can('counselor', 'leads.manage')).toBe(true);
    expect(can('counselor', 'grades.correct')).toBe(false);
    expect(can('instructor', 'grades.correct')).toBe(true);
    expect(can('instructor', 'leads.view')).toBe(false);
    expect(can('analyst', 'revenue.view')).toBe(true);
    expect(can('analyst', 'leads.view')).toBe(false);
    expect(can(null, 'overview.view')).toBe(false);
  });
  it('throws 401 without a user and 403 without the permission', () => {
    expect(() => requirePermission(null, 'audit.view')).toThrow(UnauthenticatedError);
    expect(() => requirePermission({ id: 'x', role: 'analyst' }, 'questions.edit')).toThrow(ForbiddenError);
    expect(() => requirePermission({ id: 'x', role: 'instructor' }, 'questions.edit')).not.toThrow();
    expect(roles).toHaveLength(5);
  });
});

describe('SEO foundation', () => {
  it('keeps private workspaces out of search, sitemaps and structured data', () => {
    for (const path of ['/admin', '/admin-panel', '/student-panel', '/trainer-panel', '/auth/sign-in']) {
      expect(isPrivate(path)).toBe(true);
      expect(isIndexable(path)).toBe(false);
      expect(pageMeta(path)).toMatchObject({ robots: 'noindex, nofollow', structuredData: null });
      expect(sitemapPaths()).not.toContain(path);
    }
  });
  it('blocks indexing entirely until the domain, brand and legal text are approved', () => {
    expect(robotsTxt()).toBe('User-agent: *\nDisallow: /\n');
    expect(pageMeta('/skill-test').robots).toBe('noindex, nofollow');
  });
  it('gives every route a unique title and description', () => {
    const titles = routes.map(route => route.title);
    expect(new Set(titles).size).toBe(titles.length);
    expect(new Set(routes.map(route => route.description)).size).toBe(routes.length);
    for (const route of routes) expect(route.description.length, route.path).toBeGreaterThan(40);
  });
  it('publishes six distinct landing pages with real tools and visible FAQs', () => {
    expect(landingPages.map(page => page.path)).toEqual(['/python-aptitude-test', '/developer-readiness-test', '/python-coding-challenge', '/backend-developer-roadmap', '/full-stack-developer-roadmap', '/python-interview-practice']);
    const bodies = landingPages.map(page => page.sections.map(section => section.body).join(' '));
    expect(new Set(bodies).size).toBe(bodies.length);
    for (const page of landingPages) {
      expect(page.faqs.length).toBeGreaterThan(1);
      expect(page.tool.to).toMatch(/^\/(skill-test|coding-arena|roadmap)/);
      expect(routes.some(route => route.path === page.path)).toBe(true);
      expect(JSON.stringify(page)).not.toMatch(/guarantee(d)? (placement|job)|\d+% (placement|hired)|top \d+%/i);
    }
  });
});
