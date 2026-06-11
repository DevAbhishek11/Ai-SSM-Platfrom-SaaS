import { Injectable } from "@nestjs/common";
import { demoWorkspace, type Workspace } from "@ssm/domain";

@Injectable()
export class WorkspacesService {
  private readonly workspaces: Workspace[] = [demoWorkspace];

  list(): Workspace[] {
    return this.workspaces;
  }

  getById(id: string): Workspace | undefined {
    return this.workspaces.find((workspace) => workspace.id === id);
  }
}
