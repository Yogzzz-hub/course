import { handleFinancierRequest } from "./index";

export async function GET(req: Request) {
  return handleFinancierRequest(req);
}

export default GET;
