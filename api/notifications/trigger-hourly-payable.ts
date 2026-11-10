import { triggerHourlyPayable } from "../../server/api.js";
import { toVercel } from "../../server/vercelAdapter.js";

export default toVercel(triggerHourlyPayable);
