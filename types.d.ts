export interface User {
    id: string;
    name: string;
    email: string;
    role: 'owner' | 'agent' | 'admin';
    avatar?: string;
}
export interface Subscription {
    plan: 'free' | 'pro' | 'enterprise';
    status: 'active' | 'past_due' | 'canceled';
    usageLimit: number;
    currentUsage: number;
    renewsAt: string;
}
export interface Lead {
    id: string;
    rawSource: string;
    content: string;
    urgencyScore?: number;
    analysis?: string;
    status: 'new' | 'processed' | 'contacted';
    timestamp: string;
}
export interface ChatMessage {
    id: string;
    role: 'user' | 'model';
    content: string;
    citations?: string[];
    timestamp: number;
}
export interface AgentState {
    name: string;
    role: string;
    status: 'active' | 'idle' | 'error';
    tasksCompleted: number;
}
export interface SpeedAgentConfig {
    model: string;
    active: boolean;
    enableRealTimeSearch: boolean;
    greetingTemplate: string;
    urgencyKeywords: {
        timeline: string[];
        financial: string[];
        motivation: string[];
    };
    officeHours: {
        enabled: boolean;
        startTime: string;
        endTime: string;
        days: ('mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun')[];
        autoResponderMessage: string;
    };
}
export interface SystemConfig extends SpeedAgentConfig {
    brain: {
        useSearchGrounding: boolean;
        reasoningModel: string;
        speedModel: string;
    };
}
//# sourceMappingURL=types.d.ts.map