import fs from 'fs';
import path from 'path';
import os from 'os';
import Client from '@fnndsc/chrisapi';

interface ConnectOptions {
  user: string;
  password: string;
  url: string;
}

class ChRISConnection {
  private authToken: string | null = null;
  private tokenFile: string;
  private configDir: string;

  constructor() {
    const configBase: string = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
    this.configDir = path.join(configBase, 'chjs');
    this.tokenFile = path.join(this.configDir, 'chris_cli_token');
    this.ensureConfigDirExists();
  }

  private ensureConfigDirExists(): void {
    if (!fs.existsSync(this.configDir)) {
      try {
        fs.mkdirSync(this.configDir, { recursive: true, mode: 0o700 });
      } catch (error) {
        console.error('Error creating config directory:', error);
      }
    }
  }   

  async connect(options: ConnectOptions): Promise<void> {
    const { user, password, url }: ConnectOptions = options;
    const authUrl: string = url + 'auth-token/';
  
    console.log(`Connecting to ${url} with user ${user}`);

    try {
      this.authToken = await Client.getAuthToken(authUrl, user, password);
      if (this.authToken) {
        console.log('Auth token: ' + this.authToken)
        this.saveToken();
        console.log('Auth token received and saved successfully');
        console.log('Connected successfully!');
      } else {
        console.log('Failed to receive auth token');
      }
    } catch (error) {
      console.error('Error during connection:', error);
      throw error;
    }
  }

  getAuthToken(): string | null {
    if (!this.authToken) {
      this.loadToken();
    }
    return this.authToken;
  }

  isConnected(): boolean {
    return this.getAuthToken() !== null;
  }

  logout(): void {
    this.authToken = null;
    try {
      fs.unlinkSync(this.tokenFile);
      console.log('Logged out successfully');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }

  private saveToken(): void {
    try {
      fs.writeFileSync(this.tokenFile, this.authToken || '', { mode: 0o600 });
    } catch (error) {
      console.error('Error saving token:', error);
    }
  }

  private loadToken(): void {
    try {
      this.authToken = fs.readFileSync(this.tokenFile, 'utf-8');
    } catch (error) {
      this.authToken = null;
    }
  }
}

export const chrisConnection = new ChRISConnection();

