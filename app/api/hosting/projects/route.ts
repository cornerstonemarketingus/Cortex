import { readJson, ApiError } from '@/src/crm/core/api';
import {
  jsonResponse,
  parseOptionalString,
  withApiHandler,
} from '@/src/crm/core/http';
import {
  getHostedProject,
  listHostedProjects,
  createHostedProject,
  type HostedProjectType,
} from '@/src/hosting/private-hosting';

export const runtime = 'nodejs';

type CreateProjectBody = {
  userId?: unknown;
  projectType?: unknown;
  projectName?: unknown;
  prompt?: unknown;
  sections?: unknown;
  modules?: unknown;
  services?: unknown;
  slug?: unknown;
};

function parseProjectType(value: unknown): HostedProjectType {
  return value === 'app' ? 'app' : 'website';
}

export async function GET(request: Request) {
  return withApiHandler(async () => {
    const { searchParams } = new URL(request.url);
    const userId = parseOptionalString(searchParams.get('userId'));
    const projectId = parseOptionalString(searchParams.get('projectId'));
    const projectTypeRaw = parseOptionalString(searchParams.get('projectType'));
    const projectType: HostedProjectType | undefined =
      projectTypeRaw === 'app' || projectTypeRaw === 'website'
        ? (projectTypeRaw as HostedProjectType)
        : undefined;

    if (projectId) {
      const project = await getHostedProject(projectId);
      if (!project) {
        throw new ApiError(404, 'Hosted project not found', 'HOSTED_PROJECT_NOT_FOUND');
      }
      return jsonResponse({ project });
    }

    const projects = await listHostedProjects(projectType);
    const filteredProjects = userId ? projects.filter((project) => project.userId === userId) : projects;
    return jsonResponse({ projects: filteredProjects, count: filteredProjects.length });
  });
}

export async function POST(request: Request) {
  return withApiHandler(async () => {
    const body = await readJson<CreateProjectBody>(request);
    const projectName = parseOptionalString(body.projectName);

    if (!projectName) {
      throw new ApiError(400, 'projectName is required', 'PROJECT_NAME_REQUIRED');
    }

    const project = await createHostedProject({
      userId: parseOptionalString(body.userId) || 'public-user',
      projectType: parseProjectType(body.projectType),
      projectName,
      prompt: parseOptionalString(body.prompt),
      sections: Array.isArray(body.sections)
        ? body.sections.filter((entry): entry is string => typeof entry === 'string')
        : [],
      modules: Array.isArray(body.modules)
        ? body.modules.filter((entry): entry is string => typeof entry === 'string')
        : [],
      services: Array.isArray(body.services)
        ? body.services.filter((entry): entry is string => typeof entry === 'string')
        : [],
      slug: parseOptionalString(body.slug),
    });

    return jsonResponse({ project }, 201);
  });
}
