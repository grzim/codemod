import { STARTER_SNIPPET } from "~/store/getInitialState";
import { injectCFSOutputToCodemod } from "../../../utils/injectCFSOutputToCodemod";

const generateCodemodNamePrompt = (codemod: string) => `
You are a jscodeshift codemod and javascript expert. 
Come up with a precise, detailed variable name to be used for the following jscodeshift codemod below. 
Variable name should start with "handle". 
Do not return any text other than the variable name.
\`\`\`
${codemod}
\`\`\`
`;

// msw/2/name-of-mod
const generateCodemodHumanNamePrompt = (codemod: string) => `
You are a jscodeshift codemod and javascript expert. 
Come up with a precise name to be used for the following jscodeshift codemod below.
If the codemod is aimed at making any changes to a particular framework or library, the format
should be "framework/version/name", where framework is the name of the framework or library,
version is a major version (meaning one or two digits), and name is a short name for the codemod
written in kebab-case. If you can't determine which framework this is for, you can just return the name
written in kebab-case.
Do not return any text other than the codemod name.
\`\`\`
${codemod}
\`\`\`
`;

const errorPrompt = `
	Here is codemode with runtime error: 
	$CODEMOD
	
	Here is execution error text: 
	$EXECUTION_ERROR
`;
const autoGenerateCodemodPrompt = `
  Below, you are provided with "Before" and "After" code snippets.
	The code snippets are written in JavaScript or TypeScript language.
	
	Before: 
	$BEFORE
	
	After: 
	$AFTER
	
	Consider the following jscodeshift codemod Template:
	
	\`\`\`
	import type { FileInfo, API, Options } from 'jscodeshift';
	export default function transform(
				file: FileInfo,
				api: API,
				options?: Options,
		): string | undefined {
				const j = api.jscodeshift;
				const root = j(file.source);
				
				//jscodeshift codemod implementation

				return root.toSource();
			} 
	\`\`\`
	
	Write a jscodeshift codemod that transforms the "Before" code snippet into the "After" 
	while adhering to the Template above and replace the "//jscodeshift codemod implementation" comment with  
	actual codemod implementation.

	Preserve the leading comments by using a helper function like this

	\`\`\`
  	function replaceWithComments(path, newNode) {
    	// If the original node had comments, add them to the new node
    	if (path.node.comments) {
      		newNode.comments = path.node.comments;
    	}

    	// Replace the node
    	j(path).replaceWith(newNode);
  	}
	\`\`\`
 
 
	You are only allowed to use jscodeshift library and TypeScript language. 
	Do not use any other libraries other than jscodeshift.
  Do not add any other imports other than the imports that already exist in the Template.
	
	Your codemod should not contain any typescript errors and bugs.

	Only provide the code. Do not share extra explanations.

	Before accessing jscodeshift node properties, try to narrow node's type.
	
	You can narrow node type by checking "type" property. Example: 
	
	\`\`\`
	// ensures that node is Identifier
	if(node.type === "Identifier") {
		// safely access properties of Identifier
	}
	\`\`\`
	
	When generating a node, prefer using "from" method. Example: 
	
	\`\`\`
	const arrowFunctionExpressionNode = j.arrowFunctionExpression.from({
		params,
		body,
		async, 
	);
	\`\`\`
	
	Try making your codemod modular. 

	Write comments with best practices in mind.
`;

// fixBlock V1
// @TODO add ability to include debug info/ts-error text
const fixCodemodBlockNoDebugInfoPrompt = `
  Your codemod has error(s). 
	
  This code block of the codemod contains error(s). 
	$HIGHLIGHTED_IN_CODEMOD
	
	Fix this part and return the fixed version of it as response.
	
	Only provide the code. Do not share extra explanations.
 `;

type PromptPresetKind = "fixCodemod" | "autoGenerateCodemod" | "customPrompt";
type PromptPreset = {
	kind: PromptPresetKind;
	prompt: string;
	name: string;
	description: string;
};

interface ProcessPromptResponseStrategy {
	getCodemodFromLLMResponse(prevCodemod: string, responseText: string): string;
}

const overwriteAll = {
	getCodemodFromLLMResponse: (
		prevCodemod: string,
		responseText: string,
	): string =>
		STARTER_SNIPPET.replace(
			"{%DEFAULT_FIND_REPLACE_EXPRESSION%}",
			responseText,
		).replace("{%COMMENT%}", ""),
};

const insertAtTheTop = {
	getCodemodFromLLMResponse: (
		prevCodemod: string,
		responseText: string,
		// @TODO rename
	): string => injectCFSOutputToCodemod(prevCodemod, responseText) ?? "",
};

const promptStrategies: Readonly<
	Record<PromptPresetKind, ProcessPromptResponseStrategy>
> = {
	autoGenerateCodemod: overwriteAll,
	fixCodemod: overwriteAll,
	customPrompt: insertAtTheTop,
};

export type { PromptPreset };
export {
	errorPrompt,
	promptStrategies,
	generateCodemodNamePrompt,
	generateCodemodHumanNamePrompt,
	autoGenerateCodemodPrompt,
	fixCodemodBlockNoDebugInfoPrompt,
};
