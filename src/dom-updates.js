// Avoid reparsing unchanged HTML and dirtying unchanged DOM properties.
export function setText(node,value){if(node&&node.textContent!==String(value))node.textContent=value;}
export function setHTML(node,value){if(node&&node.innerHTML!==value)node.innerHTML=value;}
export function setStyle(node,key,value){if(node&&node.style[key]!==value)node.style[key]=value;}
export function setAttribute(node,key,value){value=String(value);if(node&&node.getAttribute(key)!==value)node.setAttribute(key,value);}
