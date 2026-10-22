import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class AutoCountApi implements ICredentialType {
	name = 'autoCountApi';

	displayName = 'AutoCount Cloud Accounting API';

	icon: Icon = { light: 'file:../nodes/AutoCount/autocount.svg', dark: 'file:../nodes/AutoCount/autocount.dark.svg' };

	documentationUrl = 'https://github.com/framworq/n8n-nodes-autocount?tab=readme-ov-file#credentials';

	properties: INodeProperties[] = [
		{
			displayName: 'Account Book ID',
			name: 'accountBookId',
			type: 'string',
			required: true,
			default: '',
			placeholder: '12345',
			description:
				'The number in the AutoCount Cloud Accounting address bar after you open the company, e.g. accounting.autocountcloud.com/<strong>12345</strong>/…',
		},
		{
			displayName: 'Key ID',
			name: 'keyId',
			type: 'string',
			required: true,
			default: '',
			description: 'In AutoCount Cloud Accounting: gear icon → Find Your Key ID & API Key',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'Key-ID': '={{$credentials.keyId}}',
				'API-Key': '={{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://accounting-api.autocountcloud.com',
			url: '={{"/" + encodeURIComponent(String($credentials.accountBookId).trim()) + "/companyprofile"}}',
		},
	};
}
