import type { Request, Response } from "express";
import { created, noContent, ok, paginated } from "../responses/response.js";
import type { CollectionService } from "./collection.service.js";

/** Thin HTTP adapter: reads validated input, calls the service, returns the standard envelope. */
export class CollectionController<Dto = unknown, Create = Record<string, unknown>, Update = Record<string, unknown>> {
  constructor(
    protected readonly service: CollectionService<Dto, Create, Update>,
    protected readonly label: string,
  ) {}

  list = async (req: Request, res: Response) => {
    const { items, meta } = await this.service.list(req.query as never);
    return paginated(res, items, meta);
  };

  get = async (req: Request, res: Response) => ok(res, await this.service.get(Number(req.params.id)));

  create = async (req: Request, res: Response) =>
    created(res, await this.service.create(req.auth!, req.body as Create), `${this.label} created`);

  update = async (req: Request, res: Response) =>
    ok(res, await this.service.update(req.auth!, Number(req.params.id), req.body as Update), `${this.label} updated`);

  remove = async (req: Request, res: Response) => {
    await this.service.remove(req.auth!, Number(req.params.id));
    return noContent(res);
  };

  reorder = async (req: Request, res: Response) => {
    await this.service.reorder(req.auth!, (req.body as { ids: number[] }).ids);
    return ok(res, null, "Order saved");
  };

  publish = async (req: Request, res: Response) =>
    ok(res, await this.service.setStatus(req.auth!, Number(req.params.id), "PUBLISHED"), `${this.label} published`);

  unpublish = async (req: Request, res: Response) =>
    ok(res, await this.service.setStatus(req.auth!, Number(req.params.id), "UNPUBLISHED"), `${this.label} unpublished`);
}
