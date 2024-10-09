interface Certificate {
    Subject: string;
    Issuer: string;
    Thumbprint: string;
    NotBefore: string;
    NotAfter: string;
    timeRemaining: number | null;
    notifyBefore: number | null; // days before expiration to notify
}