export interface SetElectrodeCommand {
    cmd: "set_electrode";
    electrode: "A" | "B" | "C";
    state: boolean;
    duration?: number; // Optional countdown target in seconds
}

export interface SetModuleCountCommand {
    cmd: "set_module_count";
    count: number;
}

export interface EmergencyStopCommand {
    cmd: "emergency_stop";
}

export type ControlCommand =
    | SetElectrodeCommand
    | SetModuleCountCommand
    | EmergencyStopCommand;
