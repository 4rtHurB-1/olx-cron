import {getConfigValue} from "../utils";
import BaseSheet from "./Base";

export default new BaseSheet(
    getConfigValue(`sheets.phone_list`, false)
);