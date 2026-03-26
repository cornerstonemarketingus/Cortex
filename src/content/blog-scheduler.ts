import fs from 'fs/promises';
import path from 'path';
import { createBlogPost, type BlogStyle, type BlogRegion, type BlogMonetizationMode } from '@/src/content/blog-engine';

type BlogSchedule = {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'paused';
  cadence: 'weekly';
  dayOfWeek: number;
  hourUtc: number;
  topicTemplate: string;
  businessType: string;
  audience: string;
  region: BlogRegion;
  style: BlogStyle;
  monetizationMode: BlogMonetizationMode;
  callToAction: string;
  lastRunAt?: string;
};

type SchedulerStore = {
  version: number;
  updatedAt: string;
  schedules: BlogSchedule[];
};

const SCHEDULER_PATH = path.join(process.cwd(), 'apps', 'current_app', 'content', 'blog_scheduler.json');

function makeId(): string {
  return `sched-${Math.random().toString(36).slice(2, 10)}`;
}

async function ensureStore(): Promise<SchedulerStore> {
  try {
    const raw = await fs.readFile(SCHEDULER_PATH, 'utf8');
    return JSON.parse(raw) as SchedulerStore;
  } catch {
    await fs.mkdir(path.dirname(SCHEDULER_PATH), { recursive: true });
    const fallback: SchedulerStore = {
      version: 1,
      updatedAt: new Date().toISOString(),
      schedules: [],
    };
    await fs.writeFile(SCHEDULER_PATH, JSON.stringify(fallback, null, 2), 'utf8');
    return fallback;
  }
}

async function saveStore(store: SchedulerStore): Promise<void> {
  store.updatedAt = new Date().toISOString();
  await fs.mkdir(path.dirname(SCHEDULER_PATH), { recursive: true });
  await fs.writeFile(SCHEDULER_PATH, JSON.stringify(store, null, 2), 'utf8');
}

export async function listSchedules() {
  const store = await ensureStore();
  return store.schedules;
}

export async function createWeeklySchedule(input: {
  dayOfWeek: number;
  hourUtc: number;
  topicTemplate: string;
  businessType: string;
  audience: string;
  region: BlogRegion;
  style: BlogStyle;
  monetizationMode: BlogMonetizationMode;
  callToAction: string;
}) {
  const store = await ensureStore();

  const schedule: BlogSchedule = {
    id: makeId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'active',
    cadence: 'weekly',
    dayOfWeek: Math.max(0, Math.min(6, Math.floor(input.dayOfWeek))),
    hourUtc: Math.max(0, Math.min(23, Math.floor(input.hourUtc))),
    topicTemplate: input.topicTemplate,
    businessType: input.businessType,
    audience: input.audience,
    region: input.region,
    style: input.style,
    monetizationMode: input.monetizationMode,
    callToAction: input.callToAction,
  };

  store.schedules.unshift(schedule);
  await saveStore(store);
  return schedule;
}

function shouldRun(schedule: BlogSchedule, now: Date): boolean {
  if (schedule.status !== 'active') return false;

  const currentDay = now.getUTCDay();
  const currentHour = now.getUTCHours();

  if (currentDay !== schedule.dayOfWeek || currentHour !== schedule.hourUtc) {
    return false;
  }

  if (!schedule.lastRunAt) return true;
  const lastRun = new Date(schedule.lastRunAt);
  const msInWeek = 7 * 24 * 60 * 60 * 1000;
  return now.getTime() - lastRun.getTime() >= msInWeek;
}

function materializeTopic(template: string, now: Date): string {
  const isoDate = now.toISOString().slice(0, 10);
  return template.replace('{date}', isoDate);
}

export async function runDueSchedules(now: Date = new Date()) {
  const store = await ensureStore();
  const results: Array<{ scheduleId: string; postId?: string; title?: string; status: 'generated' | 'skipped'; reason?: string }> = [];

  for (const schedule of store.schedules) {
    if (!shouldRun(schedule, now)) {
      results.push({ scheduleId: schedule.id, status: 'skipped', reason: 'Not due' });
      continue;
    }

    const topic = materializeTopic(schedule.topicTemplate, now);
    const post = await createBlogPost({
      topic,
      businessType: schedule.businessType,
      audience: schedule.audience,
      region: schedule.region,
      cityFocus: [],
      primaryKeyword: topic.toLowerCase(),
      secondaryKeywords: [],
      callToAction: schedule.callToAction,
      tone: 'sales',
      style: schedule.style,
      monetizationMode: schedule.monetizationMode,
    });

    schedule.lastRunAt = now.toISOString();
    schedule.updatedAt = now.toISOString();
    results.push({ scheduleId: schedule.id, postId: post.id, title: post.seo.title, status: 'generated' });
  }

  await saveStore(store);
  return results;
}
