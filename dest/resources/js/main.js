var modules = window.modules = window.modules || {};
var methods = {};

modules['hex-form'] = (function () {
	
	'use strict';
	
	var elements,
		methods,
		selectors,
		state;
	
	elements = {};
	methods = {};
	selectors = {
		'viewport': 'body',
		
		'container': '.container[variant="custom-form"]',
		
		'formContainer': '.container[variant="custom-form"]',
		'formElement': '.container[variant="custom-form"] form',
		'formFullForm': '.form[variant="full-form"]',
		
		'formButton': '.submit-button',
		
		'dateFieldContainer': '.inputfield.container[variant="date"]',
		
		'requiredFields': 'input[data-required]',
		'formPostedContainer': '.container[variant*="custom-form-posted"]',
		'errorMessageContainer': '[variant*="error-message"]'
	};
	state = {};
	
	methods.htmlElement = {
		getAttribute: function(data) {
			return (data.element.getAttribute(data.attributeKey) || false);
		},
		hasAttributeValue: function(data, attributeValue) {
			if (!attributeValue) {
				attributeValue = methods.htmlElement.getAttribute(data);
			}
			var regex = new RegExp(data.attributeValue,'gi');
			return regex.test(attributeValue);
		},
		addAttributeValue: function(data) {
			var attributeValue = methods.htmlElement.getAttribute(data);
			
			if (!methods.htmlElement.hasAttributeValue(data, attributeValue)) {
				if (attributeValue) {
					attributeValue = attributeValue + ' ' + data.attributeValue;
				} else {
					attributeValue = data.attributeValue;
				}
				data.element.setAttribute(data.attributeKey, attributeValue);
			}
			return true;
		},
		removeAttributeValue: function(data) {
			var attributeValue = methods.htmlElement.getAttribute(data);
			var hasAttributeValue = methods.htmlElement.hasAttributeValue(data, attributeValue);
			var valueRemoved = false;
			if (hasAttributeValue) {
				var regex = new RegExp(data.attributeValue,'gi');
				var newAttributeValue = attributeValue.replace(regex,'').trim();
				if (newAttributeValue) {
					data.element.setAttribute(data.attributeKey, newAttributeValue);
				} else {
					data.element.removeAttribute(data.attributeKey);
				}
				valueRemoved = true;
			}
			return valueRemoved;
		},
		toggleAttributeValue: function(data) {
			data.attributeValue = data.removeAttributeValue;
			var valueToggled = false;
			var removeAttributeValue = methods.htmlElement.removeAttributeValue(data);
			
			if (removeAttributeValue) {
				data.attributeValue = data.addAttributeValue;
				methods.htmlElement.addAttributeValue(data);
				valueToggled = true;
			}
			return valueToggled;
		},
		addStateValueInvalid: function(element) {
			var data = {
				element: element,
				attributeKey: 'state',
				attributeValue: 'invalid'
			};
			
			return methods.htmlElement.addAttributeValue(data);
		},
		removeStateValueInvalid: function(element) {
			var data = {
				element: element,
				attributeKey: 'state',
				attributeValue: 'invalid'
			};
			return methods.htmlElement.removeAttributeValue(data);
		}
	};
	
	methods.fieldElement = {
		focusOut: function(event) {
			var fieldData = {
				name: event.currentTarget.name,
				values:event.currentTarget.value,
				valueCheck: event.currentTarget.dataset.valueCheck || event.currentTarget.type
			};
			var validationResponse = methods.formValidation.fieldValidation(fieldData);
			if (validationResponse.hasError) {
				methods.htmlElement.addStateValueInvalid(event.currentTarget);
			}
			methods.errorMessage.setState.hidden(event.currentTarget.form);
		},
		focusIn: function(event) {
			methods.htmlElement.removeStateValueInvalid(event.currentTarget);
		}
	};
	
	methods.form = {
		clickHandler: function(event) {
			event.preventDefault();
			methods.dateSelector.isStateInvalid(event.currentTarget);
			var formData = methods.form.serialize(event.currentTarget);
			var errorData = methods.formValidation.formData(formData.postData);
			
			if (errorData || state.containerVariantDateInvalid) {
				methods.form.errorHandler(errorData, event.currentTarget);
			} else if (!errorData && !state.containerVariantDateInvalid) {
				methods.form.postHandler(formData, event.currentTarget.action);
			}
		},
		
		postHandler: function(formData, action) {
			methods.sendData.xhr('POST', action, formData)
				.then(function(data) {
					var callbackJsonXhr = methods.sendData.callback.success(data);
					methods.form.callbackHandler(callbackJsonXhr);
				});
		},
		
		
		callbackHandler: function(data) {
			if (data.errorData && Object.keys(data.errorData).length > 0) {
				var form = elements.body.querySelector('form[name="'+data.formName+'"]');
				methods.form.errorHandler(data.errorData, form);
			} else if (data.succesData) {
				$(elements.body).trigger(new jQuery.Event('navigate', {
					url: data.succesData.page,
					animation: 'blurin',
					windowName: null,
					target: null
				}));
			}
		},
		
		errorHandler: function(errorData, element) {
			Object.keys(errorData).forEach(function (key) {
				var selector = errorData[key].data.elementType +'[name="' + errorData[key].data.name + '"]';
				var input = element.querySelector(selector);
				
				methods.htmlElement.addStateValueInvalid(input);
			});
			methods.errorMessage.setState.active(element);
		},
		
		getValueOfElement: {
			input: function(element) {
				var value;
				if (element.type && (element.type === 'radio' || element.type === 'checkbox')) {
					if (element.checked) {
						value = element.value.trim();
					}
				} else if (element.type) {
					value = element.value.trim();
				}
				return value;
			},
			
			textarea: function(element) {
				return element.value.trim();
			},
			
			select: function(element) {
				var value;
				if (element.type && element.type === 'select-one') {
					if (element.value) {
						value = element.value;
					}
				} else if (element.type && element.type === 'select-multiple') {
					value = [];
					if (element.value && element.options) {
						Object.keys(element.options).forEach(function (optionKey) {
							if (element.options[optionKey].selected) {
								value.push(element.options[optionKey].value);
							}
						});
					}
				}
				return value;
			}
		},
		
		serialize: function(form) {
			var formData = {
				formName: form.getAttribute('name') || null,
				action: form.getAttribute('action') || null,
				postData: {}
			};
			
			formData.postData = Array.prototype.slice.call(form.elements).reduce(function (data, item) {
				if (item && item.name) {
					if (!data[item.name]) {
						data[item.name] = {
							type: item.type,
							name: item.name,
							elementType: item.nodeName.toLowerCase(),
							required: item.dataset.required === 'true',
							valueCheck: item.dataset.valueCheck || item.type,
							valueKey: item.dataset.valueKey || 0,
							values: []
						};
					} else if (typeof data[item.name].valueKey === "number" && isFinite(data[item.name].valueKey) && Math.floor(data[item.name].valueKey) === data[item.name].valueKey) {
						data[item.name].valueKey++;
					}
					
					if (typeof methods.form.getValueOfElement[item.nodeName.toLowerCase()] === 'function') {
						if (methods.form.getValueOfElement[item.nodeName.toLowerCase()](item) && item.nodeName.toLowerCase() === 'select' && item.type === 'select-multiple') {
							data[item.name].values = methods.form.getValueOfElement[item.nodeName.toLowerCase()](item);
						} else if (methods.form.getValueOfElement[item.nodeName.toLowerCase()](item)) {
							if (item.dataset.valueKey) {
								data[item.name].values[item.dataset.valueKey] = methods.form.getValueOfElement[item.nodeName.toLowerCase()](item);
							} else {
								data[item.name].values.push(methods.form.getValueOfElement[item.nodeName.toLowerCase()](item));
							}
						}
					}
				}
				return data;
			},{});
			return formData;
		}
	};
	
	methods.formValidation = {
		formData: function(data) {
			var errorData = {};
			Object.keys(data).forEach(function (key) {
				if (data[key].required === true) {
					var fieldData = {
						name: data[key],
						values: data[key].values[0],
						valueCheck: data[key].valueCheck
					};
					var validationResponse = methods.formValidation.fieldValidation(fieldData);
					if (validationResponse.hasError) {
						errorData[key] = {
							data: data[key],
							message: validationResponse.errorMessage
						};
					}
				}
			});
			return (Object.keys(errorData).length > 0 ? errorData : false);
		},
		
		fieldValidation: function(data) {
			var validationResponse = {
				hasError: false,
				errorMessage: null
			};
			
			if (!methods.formValidation.validationType.isNotEmpty(data.values)) {
				validationResponse.hasError = true;
				validationResponse.errorMessage = data.name + ' field is empty';
			} else if (methods.formValidation.validationType.isNotEmpty(data.values) && typeof methods.formValidation.validationType[data.valueCheck] === 'function') {
				if (!methods.formValidation.validationType[data.valueCheck](data.values)) {
					validationResponse.hasError = true;
					validationResponse.errorMessage = data.name + ' field is not correct filled';
				}
			}
			return validationResponse;
		},
		
		validationType: {
			isNotEmpty: function(value) {
				var valueIsNotEmpty = true;
				
				if (value === undefined) {
					valueIsNotEmpty = false;
				} else  if ((typeof value === 'object' && Object.keys(value).length > 0) || value.length > 0) {
					valueIsNotEmpty = true;
					valueIsNotEmpty = true;
				} else {
					valueIsNotEmpty = false;
				}
				return valueIsNotEmpty;
			},
			
			text: function(value) {
				return true;
			},
			
			number: function(value) {
				var pattern = /^\d+$/;
				return pattern.test(value);
			},
			
			alphabetic: function(value) {
				var pattern = /^\d+$/;
				return !pattern.test(value);
			},
			
			email: function(value) {
				var pattern = /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;
				
				return pattern.test(value);
			},
			
			tel: function(value) {
				var pattern = /^(?:\+\d{1,3}|0\d{1,3}|00\d{1,2})?(?:\s?\(\d+\))?(?:[-\/\s.]|\d)+$/;
				return pattern.test(value);
			},
			
			dateFuture: function(date) {
				date.day = parseInt(date.day, 10);
				date.month = parseInt(date.month, 10) - 1;
				date.year = parseInt(date.year, 10) + 2000;
				
				var temp = new Date(date.year, date.month, date.day);
				var now = new Date();
				
				if (now < temp && temp.getDate() === date.day && temp.getMonth() === date.month && temp.getFullYear() === date.year) {
					return true;
				} else {
					return false;
				}
			}
			
		}
	};
	
	methods.sendData = {
		xhr: function(method, url, data) {
			/*
			var promise = new Promise( function (resolve, reject) {
				var request = new XMLHttpRequest();
				request.open(method, url);
				request.setRequestHeader("Content-Type","application/json; charset=utf-8");
				request.send(JSON.stringify(data));
				request.onload = function () {
					if (request.status === 200) {
						resolve(request.response);
					} else {
						reject(request.statusText);
					}
				};
				request.onerror = function () {
					reject(request.statusText);
				};
			});
			return promise;
		},
		callback: {
			success: function(data){
				return JSON.parse(data);
			},
			error: function(data){
				//console.error(data);
			}
			*/
		}
	};
	
	methods.errorMessage = {
		setState: {
			hidden: function(element) {
				var data = {
					element: element.querySelector(selectors.errorMessageContainer),
					attributeKey: 'state',
					addAttributeValue: 'hidden',
					removeAttributeValue: 'active'
				};
				methods.errorMessage.toggleState(data);
			},
			active: function(element) {
				var data = {
					element: element.querySelector(selectors.errorMessageContainer),
					attributeKey: 'state',
					addAttributeValue: 'active',
					removeAttributeValue: 'hidden'
				};
				
				methods.errorMessage.toggleState(data);
			}
		},
		getState: function(element) {
			return element.querySelector(selectors.errorMessageContainer).getAttribute('state');
		},
		toggleState: function(data) {
			methods.htmlElement.toggleAttributeValue(data);
		}
	};
	
	methods.dateSelector = {
		fullChangeHandler: function (event) {
			var date = methods.dateSelector.convertFullToSeperated(elements.dateSelectorFullDate.value);
			elements.dateSelectorDay.value = date.day;
			elements.dateSelectorMonth.value = date.month;
			elements.dateSelectorYear.value = date.year.toString().slice(-2);
		},
		
		changeHandler: function (event) {
			var element;

			// cancel keyup-event if key was not a number or TAB or ENTER
			if (methods.dateSelector.testKeyUpEvent(event)) {
				methods.dateSelector.testValues();
				methods.dateSelector.applyState();
				
				if (event.type === 'keyup' || event.type === 'keydown') {
					element = event.currentTarget;
					if ((element.value.length >= methods.dateSelector.maxInputLength(element)) && (event.keyCode !== 16) && (event.keyCode !== 9) && (event.keyCode !== 8)) {
						methods.dateSelector.jumpToNextInput(element);
					}
				}
			} else {
				// this is a keydown being cancelled, thus no keyup occurs on this 'change'
				event.preventDefault();
				event.stopImmediatePropagation();
			}
		},
		
		testValues: function (event) {
			state.age = {
				day: elements.dateSelectorDay.value,
				month: elements.dateSelectorMonth.value,
				year: elements.dateSelectorYear.value
			};
			
			if (state.age.day && state.age.month && state.age.year) {
				if (methods.formValidation.validationType.dateFuture(state.age)) {
					state.ageState = 'valid';
				} else {
					state.ageState = 'invalid';
				}
			} else if (state.age.day || state.age.month || state.age.year) {
				state.ageState = 'progress';
			} else {
				state.ageState = 'initial';
			}
			
			return (state.ageState === 'valid');
		},
		
		testFullDateSupport: function () {
			return (elements.dateSelectorFullDate.type === 'date');
		},
		
		testKeyUpEvent: function (event) {
			var isKeyUp = (event.type === 'keydown');
			var isTab = (event.keyCode === 9);
			var isEnter = (event.keyCode === 13);
			var isBackspace = (event.keyCode === 8);
			var isDelete = (event.keyCode === 46);
			var isNumeric = String.fromCharCode(event.keyCode).match(/[0-9]/);
			var isNumpad = (event.keyCode >= 96) && (event.keyCode <= 105);
			var isNumAndroid = (event.keyCode === 229);
			
			if (!isKeyUp) {
				return true;
			}
			
			if (isKeyUp && (isTab || isEnter || isNumeric || isBackspace || isDelete || isNumpad || isNumAndroid)) {
				return true;
			} else {
				return false;
			}
		},
		
		convertFullToSeperated: function (value) {
			value = new Date(value);
			return {
				day: value.getDate(),
				month: value.getMonth() + 1,
				year: value.getFullYear()
			};
		},
		
		checkInputLength: function(currentElement) {
			return currentElement.value.length;
		},
		
		maxInputLength: function(element) {
			return element.getAttribute('maxlength');
		},
		
		nextInput: function(currentElement) {
			return currentElement.getAttribute('data-nextfield');
		},
		
		jumpToNextInput: function(currentElement) {
			var nextInputData = methods.dateSelector.nextInput(currentElement);
			if (nextInputData !== null) {
				document.getElementById(nextInputData).focus();
			}
		},
		
		dateInput: function(options) {
			var current = options.current;
			var currentKeyCode = options.keyCode;
			var inputLength = methods.dateSelector.checkInputLength(current);
			var maxInputLength = methods.dateSelector.maxInputLength(current);
			
			if ((inputLength == maxInputLength) && (currentKeyCode !== 16) && (currentKeyCode !== 9)) {
				methods.dateSelector.jumpToNextInput(current);
			}
		},
		
		applyState: function (input) {
			if (input) {
				elements.dateSelectorContainer.setAttribute('state', input);
			} else {
				methods.dateSelector.testValues();
				
				elements.dateSelectorContainer.setAttribute('state', state.ageState);
			}
		},
		
		getContainer: function(element) {
			return element.querySelectorAll(selectors.dateFieldContainer) || false;
		},
		
		isStateInvalid: function(element) {
			var dateContainers = methods.dateSelector.getContainer(element);
			state.containerVariantDateInvalid = false;
			if (dateContainers) {
				[].slice.call(dateContainers).forEach(function (item) {
					if (item.getAttribute('state') !== 'valid') {
						state.containerVariantDateInvalid = true;
					}
				});
			}
			return state.containerVariantDateInvalid;
		}
	};
	
	methods.mount = function (viewport) {
		viewport = viewport || document;
		var found = document.querySelector(selectors.container);
		
		if (found) {
			elements.window = window;
			elements.body = document.querySelector('body');
			elements.viewport = viewport || document.querySelector(selectors.viewport);
			elements.formContainer = found;
			return true;
		} else {
			return false;
		}
	};
	
	methods.init = function(viewport) {
		if (elements.formContainer) {
			elements.formElement = elements.formContainer.querySelectorAll(selectors.formElement);
			elements.requiredFields = elements.formContainer.querySelectorAll(selectors.requiredFields);
			elements.postedContainers = elements.formContainer.querySelector(selectors.formPostedContainer);
			
			elements.dateSelectorContainer = elements.formContainer.querySelector('[variant*="date"]');
			if (elements.dateSelectorContainer) {
				elements.dateSelectorDay = elements.dateSelectorContainer.querySelector('[variant*="day"]');
				elements.dateSelectorMonth = elements.dateSelectorContainer.querySelector('[variant*="month"]');
				elements.dateSelectorYear =	elements.dateSelectorContainer.querySelector('[variant*="year"]');
				elements.dateSelectorFullDate =	elements.dateSelectorContainer.querySelector('[variant*="full"]');
				elements.dateSelector =	elements.dateSelectorContainer.querySelectorAll('[variant*="dateselector"]');
				elements.dateSelectorAllFields = elements.dateSelectorContainer.querySelectorAll('.input');
				state.fullDateSupport = methods.dateSelector.testFullDateSupport();
				
				state.isMobile = (elements.window.innerWidth < 700);
				if (elements.dateSelectorFullDate && state.fullDateSupport && state.isMobile) {
					
					elements.dateSelectorFullDate.setAttribute('state', 'active');
				}
				
				var dateSelector = [elements.dateSelectorDay, elements.dateSelectorMonth, elements.dateSelectorYear];
	
				Object.keys(dateSelector).forEach( function (key) {
					dateSelector[key].addEventListener('keydown',  methods.dateSelector.changeHandler);
					dateSelector[key].addEventListener('keyup',  methods.dateSelector.changeHandler);
					dateSelector[key].addEventListener('change',  methods.dateSelector.changeHandler);
				});
			}
			
			Object.keys(elements.formElement).forEach( function (key) {
				elements.formElement[key].addEventListener('submit', methods.form.clickHandler);
			});
			
			Object.keys(elements.requiredFields).forEach( function (key) {
				elements.requiredFields[key].addEventListener('focusin', methods.fieldElement.focusIn);
				elements.requiredFields[key].addEventListener('focusout', methods.fieldElement.focusOut);
			});
			
			return true;
		} else {
			return false;
		}
	};
	
	methods.render = function (viewport) {
		if (elements.formContainer) {
			
			return true;
		} else {
			return false;
		}
	};
	
	methods.unmount = function () {
		if (elements.formContainer) {
			$(elements.formElement).off('submit', methods.form.clickHandler);
			$(elements.dateSelectorAllFields).on('click', methods.dateSelector.setFocus);
			$(elements.dateSelectorFullDate).on('change', methods.dateSelector.fullChangeHandler);
		}
	};
	
	return {
		mount: methods.mount,
		init: methods.init,
		unmount: methods.unmount,
		render: methods.render,
		
		selector: selectors.container
	};
}());
methods.modules = {
	'initAll': function (viewport) {
		Object.keys(modules).forEach( function (moduleName, key) {
			try {
				if (modules[moduleName].init) {
					var existed = modules[moduleName].init(viewport);
					if (existed) {
						// console.info('initialised module: ', moduleName);
					}
				}
			} catch (error) {
				// console.warn('failed to init module: ', moduleName);
			}
		});
	},
	'mountAll': function (viewport) {
		Object.keys(modules).forEach( function (moduleName, key) {
			try {
				if (modules[moduleName].mount) {
					var existed = modules[moduleName].mount(viewport);
					if (existed) {
						//console.info('mounted module: ', moduleName);
					}
				}
			} catch (error) {
				// console.warn('failed to mount module: ', moduleName);
			}
		});
	},
	'unmountAll': function () {
		Object.keys(modules).forEach( function (moduleName) {
			try {
				modules[moduleName].unmount();
			} catch (error) {
				//console.warn('failed to unmount module: ', moduleName);
				//console.error(error);
			}
		});
	},
	'renderAll': function () {
		Object.keys(modules).forEach( function (moduleName) {
			try {
				modules[moduleName].render();
			} catch (error) {
				//console.warn('failed to Render module: ', moduleName);
				//console.error(error);
			}
		});
	}
};
(function(){
	'use strict';
	
	var elements,
		methods,
		accessibility;
	
	elements = {};
	methods = {};
	
	methods.htmlElement = {
		getAttribute: function(data) {
			if (data.element) {
				return (data.element.getAttribute(data.attributeKey) || false);
			}
		},
		hasAttributeValue: function(data, attributeValue) {
			if (!attributeValue) {
				attributeValue = methods.htmlElement.getAttribute(data);
			}
			var regex = new RegExp(data.attributeValue, 'gi');
			return regex.test(attributeValue);
		},
		addAttributeValue: function(data) {
			var attributeValue = methods.htmlElement.getAttribute(data);
			
			if (!methods.htmlElement.hasAttributeValue(data, attributeValue)) {
				if (attributeValue) {
					attributeValue = attributeValue + ' ' + data.attributeValue;
				} else {
					attributeValue = data.attributeValue;
				}
				data.element.setAttribute(data.attributeKey, attributeValue);
			}
			return true;
		},
		removeAttributeValue: function(data) {
			var attributeValue = methods.htmlElement.getAttribute(data);
			var hasAttributeValue = methods.htmlElement.hasAttributeValue(data, attributeValue);
			var valueRemoved = false;
			if (hasAttributeValue) {
				var regex = new RegExp(data.attributeValue, 'gi');
				var newAttributeValue = attributeValue.replace(regex, '').trim();
				if (newAttributeValue) {
					data.element.setAttribute(data.attributeKey, newAttributeValue);
				} else {
					data.element.removeAttribute(data.attributeKey);
				}
				valueRemoved = true;
			}
			return valueRemoved;
		},
		toggleAttributeValue: function(data) {
			data.attributeValue = data.removeAttributeValue;
			var valueToggled = false;
			var removeAttributeValue = methods.htmlElement.removeAttributeValue(data);
			
			if (removeAttributeValue) {
				data.attributeValue = data.addAttributeValue;
				methods.htmlElement.addAttributeValue(data);
				valueToggled = true;
			}
			return valueToggled;
		}
	};
	

	methods.accessibility = {
		set: function(data) {
			methods.htmlElement.toggleAttributeValue(data);
			methods.accessibility.setLocalStore(data.element);
		},
		getFromElement: function(data) {
			return methods.htmlElement.getAttribute(data);
		},
		setLocalStore: function(data) {
			return accessibility = methods.accessibility.getFromElement(data);
			
		},
		getLocalStore: function() {
			return accessibility;
		},
		dataMouse: function() {
			var data = {
				element: elements.body,
				attributeKey: 'accessibility',
				addAttributeValue: 'mouse',
				removeAttributeValue: 'keyboard'
			};
			return data;
		},
		dataKeyboard: function() {
			var data = {
				element: elements.body,
				attributeKey: 'accessibility',
				addAttributeValue: 'keyboard',
				removeAttributeValue: 'mouse'
			};
			
			return data;
		}
	};
	
	methods.eventListener = {
		mouse: function() {
			addEventListener('keydown', methods.eventListener.setKeyboard);
			removeEventListener('mousedown', methods.eventListener.setMouse);
		},
		keyboard: function() {
			addEventListener('mousedown', methods.eventListener.setMouse);
			removeEventListener('mousedown', methods.eventListener.setKeyboard);
		},
		setMouse: function() {
			var data = methods.accessibility.dataMouse();
			methods.accessibility.set(data);
			methods.eventListener.mouse();
		},
		setKeyboard: function() {
			var data = methods.accessibility.dataKeyboard();
			methods.accessibility.set(data);
			methods.eventListener.keyboard();
		}
	};
	
	methods.init = function() {
		elements.body = document.querySelector('body');
		var data = {
			element: elements.body,
			attributeKey: 'accessibility'
		};
		
		data.addAttributeValue = methods.accessibility.getFromElement(data);
		
		methods.accessibility.setLocalStore(data);
		
		if (methods.accessibility.getLocalStore() === 'mouse') {
			methods.eventListener.mouse();
		} else if (methods.accessibility.getLocalStore() === 'keyboard') {
			methods.eventListener.keyboard();
		}
	};

	methods.init();
})();
(function() {
	methods.modules.mountAll('body');
	methods.modules.initAll('body');
})();
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZvcm0uanMiLCJtb2R1bGVzLmpzIiwib3V0bGluZS5qcyIsImRlZmF1bHQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM1bkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNqREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDL0lBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6Im1haW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgbW9kdWxlcyA9IHdpbmRvdy5tb2R1bGVzID0gd2luZG93Lm1vZHVsZXMgfHwge307XHJcbnZhciBtZXRob2RzID0ge307XHJcblxyXG5tb2R1bGVzWydoZXgtZm9ybSddID0gKGZ1bmN0aW9uICgpIHtcclxuXHRcclxuXHQndXNlIHN0cmljdCc7XHJcblx0XHJcblx0dmFyIGVsZW1lbnRzLFxyXG5cdFx0bWV0aG9kcyxcclxuXHRcdHNlbGVjdG9ycyxcclxuXHRcdHN0YXRlO1xyXG5cdFxyXG5cdGVsZW1lbnRzID0ge307XHJcblx0bWV0aG9kcyA9IHt9O1xyXG5cdHNlbGVjdG9ycyA9IHtcclxuXHRcdCd2aWV3cG9ydCc6ICdib2R5JyxcclxuXHRcdFxyXG5cdFx0J2NvbnRhaW5lcic6ICcuY29udGFpbmVyW3ZhcmlhbnQ9XCJjdXN0b20tZm9ybVwiXScsXHJcblx0XHRcclxuXHRcdCdmb3JtQ29udGFpbmVyJzogJy5jb250YWluZXJbdmFyaWFudD1cImN1c3RvbS1mb3JtXCJdJyxcclxuXHRcdCdmb3JtRWxlbWVudCc6ICcuY29udGFpbmVyW3ZhcmlhbnQ9XCJjdXN0b20tZm9ybVwiXSBmb3JtJyxcclxuXHRcdCdmb3JtRnVsbEZvcm0nOiAnLmZvcm1bdmFyaWFudD1cImZ1bGwtZm9ybVwiXScsXHJcblx0XHRcclxuXHRcdCdmb3JtQnV0dG9uJzogJy5zdWJtaXQtYnV0dG9uJyxcclxuXHRcdFxyXG5cdFx0J2RhdGVGaWVsZENvbnRhaW5lcic6ICcuaW5wdXRmaWVsZC5jb250YWluZXJbdmFyaWFudD1cImRhdGVcIl0nLFxyXG5cdFx0XHJcblx0XHQncmVxdWlyZWRGaWVsZHMnOiAnaW5wdXRbZGF0YS1yZXF1aXJlZF0nLFxyXG5cdFx0J2Zvcm1Qb3N0ZWRDb250YWluZXInOiAnLmNvbnRhaW5lclt2YXJpYW50Kj1cImN1c3RvbS1mb3JtLXBvc3RlZFwiXScsXHJcblx0XHQnZXJyb3JNZXNzYWdlQ29udGFpbmVyJzogJ1t2YXJpYW50Kj1cImVycm9yLW1lc3NhZ2VcIl0nXHJcblx0fTtcclxuXHRzdGF0ZSA9IHt9O1xyXG5cdFxyXG5cdG1ldGhvZHMuaHRtbEVsZW1lbnQgPSB7XHJcblx0XHRnZXRBdHRyaWJ1dGU6IGZ1bmN0aW9uKGRhdGEpIHtcclxuXHRcdFx0cmV0dXJuIChkYXRhLmVsZW1lbnQuZ2V0QXR0cmlidXRlKGRhdGEuYXR0cmlidXRlS2V5KSB8fCBmYWxzZSk7XHJcblx0XHR9LFxyXG5cdFx0aGFzQXR0cmlidXRlVmFsdWU6IGZ1bmN0aW9uKGRhdGEsIGF0dHJpYnV0ZVZhbHVlKSB7XHJcblx0XHRcdGlmICghYXR0cmlidXRlVmFsdWUpIHtcclxuXHRcdFx0XHRhdHRyaWJ1dGVWYWx1ZSA9IG1ldGhvZHMuaHRtbEVsZW1lbnQuZ2V0QXR0cmlidXRlKGRhdGEpO1xyXG5cdFx0XHR9XHJcblx0XHRcdHZhciByZWdleCA9IG5ldyBSZWdFeHAoZGF0YS5hdHRyaWJ1dGVWYWx1ZSwnZ2knKTtcclxuXHRcdFx0cmV0dXJuIHJlZ2V4LnRlc3QoYXR0cmlidXRlVmFsdWUpO1xyXG5cdFx0fSxcclxuXHRcdGFkZEF0dHJpYnV0ZVZhbHVlOiBmdW5jdGlvbihkYXRhKSB7XHJcblx0XHRcdHZhciBhdHRyaWJ1dGVWYWx1ZSA9IG1ldGhvZHMuaHRtbEVsZW1lbnQuZ2V0QXR0cmlidXRlKGRhdGEpO1xyXG5cdFx0XHRcclxuXHRcdFx0aWYgKCFtZXRob2RzLmh0bWxFbGVtZW50Lmhhc0F0dHJpYnV0ZVZhbHVlKGRhdGEsIGF0dHJpYnV0ZVZhbHVlKSkge1xyXG5cdFx0XHRcdGlmIChhdHRyaWJ1dGVWYWx1ZSkge1xyXG5cdFx0XHRcdFx0YXR0cmlidXRlVmFsdWUgPSBhdHRyaWJ1dGVWYWx1ZSArICcgJyArIGRhdGEuYXR0cmlidXRlVmFsdWU7XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdGF0dHJpYnV0ZVZhbHVlID0gZGF0YS5hdHRyaWJ1dGVWYWx1ZTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0ZGF0YS5lbGVtZW50LnNldEF0dHJpYnV0ZShkYXRhLmF0dHJpYnV0ZUtleSwgYXR0cmlidXRlVmFsdWUpO1xyXG5cdFx0XHR9XHJcblx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0fSxcclxuXHRcdHJlbW92ZUF0dHJpYnV0ZVZhbHVlOiBmdW5jdGlvbihkYXRhKSB7XHJcblx0XHRcdHZhciBhdHRyaWJ1dGVWYWx1ZSA9IG1ldGhvZHMuaHRtbEVsZW1lbnQuZ2V0QXR0cmlidXRlKGRhdGEpO1xyXG5cdFx0XHR2YXIgaGFzQXR0cmlidXRlVmFsdWUgPSBtZXRob2RzLmh0bWxFbGVtZW50Lmhhc0F0dHJpYnV0ZVZhbHVlKGRhdGEsIGF0dHJpYnV0ZVZhbHVlKTtcclxuXHRcdFx0dmFyIHZhbHVlUmVtb3ZlZCA9IGZhbHNlO1xyXG5cdFx0XHRpZiAoaGFzQXR0cmlidXRlVmFsdWUpIHtcclxuXHRcdFx0XHR2YXIgcmVnZXggPSBuZXcgUmVnRXhwKGRhdGEuYXR0cmlidXRlVmFsdWUsJ2dpJyk7XHJcblx0XHRcdFx0dmFyIG5ld0F0dHJpYnV0ZVZhbHVlID0gYXR0cmlidXRlVmFsdWUucmVwbGFjZShyZWdleCwnJykudHJpbSgpO1xyXG5cdFx0XHRcdGlmIChuZXdBdHRyaWJ1dGVWYWx1ZSkge1xyXG5cdFx0XHRcdFx0ZGF0YS5lbGVtZW50LnNldEF0dHJpYnV0ZShkYXRhLmF0dHJpYnV0ZUtleSwgbmV3QXR0cmlidXRlVmFsdWUpO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRkYXRhLmVsZW1lbnQucmVtb3ZlQXR0cmlidXRlKGRhdGEuYXR0cmlidXRlS2V5KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0dmFsdWVSZW1vdmVkID0gdHJ1ZTtcclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm4gdmFsdWVSZW1vdmVkO1xyXG5cdFx0fSxcclxuXHRcdHRvZ2dsZUF0dHJpYnV0ZVZhbHVlOiBmdW5jdGlvbihkYXRhKSB7XHJcblx0XHRcdGRhdGEuYXR0cmlidXRlVmFsdWUgPSBkYXRhLnJlbW92ZUF0dHJpYnV0ZVZhbHVlO1xyXG5cdFx0XHR2YXIgdmFsdWVUb2dnbGVkID0gZmFsc2U7XHJcblx0XHRcdHZhciByZW1vdmVBdHRyaWJ1dGVWYWx1ZSA9IG1ldGhvZHMuaHRtbEVsZW1lbnQucmVtb3ZlQXR0cmlidXRlVmFsdWUoZGF0YSk7XHJcblx0XHRcdFxyXG5cdFx0XHRpZiAocmVtb3ZlQXR0cmlidXRlVmFsdWUpIHtcclxuXHRcdFx0XHRkYXRhLmF0dHJpYnV0ZVZhbHVlID0gZGF0YS5hZGRBdHRyaWJ1dGVWYWx1ZTtcclxuXHRcdFx0XHRtZXRob2RzLmh0bWxFbGVtZW50LmFkZEF0dHJpYnV0ZVZhbHVlKGRhdGEpO1xyXG5cdFx0XHRcdHZhbHVlVG9nZ2xlZCA9IHRydWU7XHJcblx0XHRcdH1cclxuXHRcdFx0cmV0dXJuIHZhbHVlVG9nZ2xlZDtcclxuXHRcdH0sXHJcblx0XHRhZGRTdGF0ZVZhbHVlSW52YWxpZDogZnVuY3Rpb24oZWxlbWVudCkge1xyXG5cdFx0XHR2YXIgZGF0YSA9IHtcclxuXHRcdFx0XHRlbGVtZW50OiBlbGVtZW50LFxyXG5cdFx0XHRcdGF0dHJpYnV0ZUtleTogJ3N0YXRlJyxcclxuXHRcdFx0XHRhdHRyaWJ1dGVWYWx1ZTogJ2ludmFsaWQnXHJcblx0XHRcdH07XHJcblx0XHRcdFxyXG5cdFx0XHRyZXR1cm4gbWV0aG9kcy5odG1sRWxlbWVudC5hZGRBdHRyaWJ1dGVWYWx1ZShkYXRhKTtcclxuXHRcdH0sXHJcblx0XHRyZW1vdmVTdGF0ZVZhbHVlSW52YWxpZDogZnVuY3Rpb24oZWxlbWVudCkge1xyXG5cdFx0XHR2YXIgZGF0YSA9IHtcclxuXHRcdFx0XHRlbGVtZW50OiBlbGVtZW50LFxyXG5cdFx0XHRcdGF0dHJpYnV0ZUtleTogJ3N0YXRlJyxcclxuXHRcdFx0XHRhdHRyaWJ1dGVWYWx1ZTogJ2ludmFsaWQnXHJcblx0XHRcdH07XHJcblx0XHRcdHJldHVybiBtZXRob2RzLmh0bWxFbGVtZW50LnJlbW92ZUF0dHJpYnV0ZVZhbHVlKGRhdGEpO1xyXG5cdFx0fVxyXG5cdH07XHJcblx0XHJcblx0bWV0aG9kcy5maWVsZEVsZW1lbnQgPSB7XHJcblx0XHRmb2N1c091dDogZnVuY3Rpb24oZXZlbnQpIHtcclxuXHRcdFx0dmFyIGZpZWxkRGF0YSA9IHtcclxuXHRcdFx0XHRuYW1lOiBldmVudC5jdXJyZW50VGFyZ2V0Lm5hbWUsXHJcblx0XHRcdFx0dmFsdWVzOmV2ZW50LmN1cnJlbnRUYXJnZXQudmFsdWUsXHJcblx0XHRcdFx0dmFsdWVDaGVjazogZXZlbnQuY3VycmVudFRhcmdldC5kYXRhc2V0LnZhbHVlQ2hlY2sgfHwgZXZlbnQuY3VycmVudFRhcmdldC50eXBlXHJcblx0XHRcdH07XHJcblx0XHRcdHZhciB2YWxpZGF0aW9uUmVzcG9uc2UgPSBtZXRob2RzLmZvcm1WYWxpZGF0aW9uLmZpZWxkVmFsaWRhdGlvbihmaWVsZERhdGEpO1xyXG5cdFx0XHRpZiAodmFsaWRhdGlvblJlc3BvbnNlLmhhc0Vycm9yKSB7XHJcblx0XHRcdFx0bWV0aG9kcy5odG1sRWxlbWVudC5hZGRTdGF0ZVZhbHVlSW52YWxpZChldmVudC5jdXJyZW50VGFyZ2V0KTtcclxuXHRcdFx0fVxyXG5cdFx0XHRtZXRob2RzLmVycm9yTWVzc2FnZS5zZXRTdGF0ZS5oaWRkZW4oZXZlbnQuY3VycmVudFRhcmdldC5mb3JtKTtcclxuXHRcdH0sXHJcblx0XHRmb2N1c0luOiBmdW5jdGlvbihldmVudCkge1xyXG5cdFx0XHRtZXRob2RzLmh0bWxFbGVtZW50LnJlbW92ZVN0YXRlVmFsdWVJbnZhbGlkKGV2ZW50LmN1cnJlbnRUYXJnZXQpO1xyXG5cdFx0fVxyXG5cdH07XHJcblx0XHJcblx0bWV0aG9kcy5mb3JtID0ge1xyXG5cdFx0Y2xpY2tIYW5kbGVyOiBmdW5jdGlvbihldmVudCkge1xyXG5cdFx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cdFx0XHRtZXRob2RzLmRhdGVTZWxlY3Rvci5pc1N0YXRlSW52YWxpZChldmVudC5jdXJyZW50VGFyZ2V0KTtcclxuXHRcdFx0dmFyIGZvcm1EYXRhID0gbWV0aG9kcy5mb3JtLnNlcmlhbGl6ZShldmVudC5jdXJyZW50VGFyZ2V0KTtcclxuXHRcdFx0dmFyIGVycm9yRGF0YSA9IG1ldGhvZHMuZm9ybVZhbGlkYXRpb24uZm9ybURhdGEoZm9ybURhdGEucG9zdERhdGEpO1xyXG5cdFx0XHRcclxuXHRcdFx0aWYgKGVycm9yRGF0YSB8fCBzdGF0ZS5jb250YWluZXJWYXJpYW50RGF0ZUludmFsaWQpIHtcclxuXHRcdFx0XHRtZXRob2RzLmZvcm0uZXJyb3JIYW5kbGVyKGVycm9yRGF0YSwgZXZlbnQuY3VycmVudFRhcmdldCk7XHJcblx0XHRcdH0gZWxzZSBpZiAoIWVycm9yRGF0YSAmJiAhc3RhdGUuY29udGFpbmVyVmFyaWFudERhdGVJbnZhbGlkKSB7XHJcblx0XHRcdFx0bWV0aG9kcy5mb3JtLnBvc3RIYW5kbGVyKGZvcm1EYXRhLCBldmVudC5jdXJyZW50VGFyZ2V0LmFjdGlvbik7XHJcblx0XHRcdH1cclxuXHRcdH0sXHJcblx0XHRcclxuXHRcdHBvc3RIYW5kbGVyOiBmdW5jdGlvbihmb3JtRGF0YSwgYWN0aW9uKSB7XHJcblx0XHRcdG1ldGhvZHMuc2VuZERhdGEueGhyKCdQT1NUJywgYWN0aW9uLCBmb3JtRGF0YSlcclxuXHRcdFx0XHQudGhlbihmdW5jdGlvbihkYXRhKSB7XHJcblx0XHRcdFx0XHR2YXIgY2FsbGJhY2tKc29uWGhyID0gbWV0aG9kcy5zZW5kRGF0YS5jYWxsYmFjay5zdWNjZXNzKGRhdGEpO1xyXG5cdFx0XHRcdFx0bWV0aG9kcy5mb3JtLmNhbGxiYWNrSGFuZGxlcihjYWxsYmFja0pzb25YaHIpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0fSxcclxuXHRcdFxyXG5cdFx0XHJcblx0XHRjYWxsYmFja0hhbmRsZXI6IGZ1bmN0aW9uKGRhdGEpIHtcclxuXHRcdFx0aWYgKGRhdGEuZXJyb3JEYXRhICYmIE9iamVjdC5rZXlzKGRhdGEuZXJyb3JEYXRhKS5sZW5ndGggPiAwKSB7XHJcblx0XHRcdFx0dmFyIGZvcm0gPSBlbGVtZW50cy5ib2R5LnF1ZXJ5U2VsZWN0b3IoJ2Zvcm1bbmFtZT1cIicrZGF0YS5mb3JtTmFtZSsnXCJdJyk7XHJcblx0XHRcdFx0bWV0aG9kcy5mb3JtLmVycm9ySGFuZGxlcihkYXRhLmVycm9yRGF0YSwgZm9ybSk7XHJcblx0XHRcdH0gZWxzZSBpZiAoZGF0YS5zdWNjZXNEYXRhKSB7XHJcblx0XHRcdFx0JChlbGVtZW50cy5ib2R5KS50cmlnZ2VyKG5ldyBqUXVlcnkuRXZlbnQoJ25hdmlnYXRlJywge1xyXG5cdFx0XHRcdFx0dXJsOiBkYXRhLnN1Y2Nlc0RhdGEucGFnZSxcclxuXHRcdFx0XHRcdGFuaW1hdGlvbjogJ2JsdXJpbicsXHJcblx0XHRcdFx0XHR3aW5kb3dOYW1lOiBudWxsLFxyXG5cdFx0XHRcdFx0dGFyZ2V0OiBudWxsXHJcblx0XHRcdFx0fSkpO1xyXG5cdFx0XHR9XHJcblx0XHR9LFxyXG5cdFx0XHJcblx0XHRlcnJvckhhbmRsZXI6IGZ1bmN0aW9uKGVycm9yRGF0YSwgZWxlbWVudCkge1xyXG5cdFx0XHRPYmplY3Qua2V5cyhlcnJvckRhdGEpLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xyXG5cdFx0XHRcdHZhciBzZWxlY3RvciA9IGVycm9yRGF0YVtrZXldLmRhdGEuZWxlbWVudFR5cGUgKydbbmFtZT1cIicgKyBlcnJvckRhdGFba2V5XS5kYXRhLm5hbWUgKyAnXCJdJztcclxuXHRcdFx0XHR2YXIgaW5wdXQgPSBlbGVtZW50LnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdG1ldGhvZHMuaHRtbEVsZW1lbnQuYWRkU3RhdGVWYWx1ZUludmFsaWQoaW5wdXQpO1xyXG5cdFx0XHR9KTtcclxuXHRcdFx0bWV0aG9kcy5lcnJvck1lc3NhZ2Uuc2V0U3RhdGUuYWN0aXZlKGVsZW1lbnQpO1xyXG5cdFx0fSxcclxuXHRcdFxyXG5cdFx0Z2V0VmFsdWVPZkVsZW1lbnQ6IHtcclxuXHRcdFx0aW5wdXQ6IGZ1bmN0aW9uKGVsZW1lbnQpIHtcclxuXHRcdFx0XHR2YXIgdmFsdWU7XHJcblx0XHRcdFx0aWYgKGVsZW1lbnQudHlwZSAmJiAoZWxlbWVudC50eXBlID09PSAncmFkaW8nIHx8IGVsZW1lbnQudHlwZSA9PT0gJ2NoZWNrYm94JykpIHtcclxuXHRcdFx0XHRcdGlmIChlbGVtZW50LmNoZWNrZWQpIHtcclxuXHRcdFx0XHRcdFx0dmFsdWUgPSBlbGVtZW50LnZhbHVlLnRyaW0oKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9IGVsc2UgaWYgKGVsZW1lbnQudHlwZSkge1xyXG5cdFx0XHRcdFx0dmFsdWUgPSBlbGVtZW50LnZhbHVlLnRyaW0oKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0cmV0dXJuIHZhbHVlO1xyXG5cdFx0XHR9LFxyXG5cdFx0XHRcclxuXHRcdFx0dGV4dGFyZWE6IGZ1bmN0aW9uKGVsZW1lbnQpIHtcclxuXHRcdFx0XHRyZXR1cm4gZWxlbWVudC52YWx1ZS50cmltKCk7XHJcblx0XHRcdH0sXHJcblx0XHRcdFxyXG5cdFx0XHRzZWxlY3Q6IGZ1bmN0aW9uKGVsZW1lbnQpIHtcclxuXHRcdFx0XHR2YXIgdmFsdWU7XHJcblx0XHRcdFx0aWYgKGVsZW1lbnQudHlwZSAmJiBlbGVtZW50LnR5cGUgPT09ICdzZWxlY3Qtb25lJykge1xyXG5cdFx0XHRcdFx0aWYgKGVsZW1lbnQudmFsdWUpIHtcclxuXHRcdFx0XHRcdFx0dmFsdWUgPSBlbGVtZW50LnZhbHVlO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0gZWxzZSBpZiAoZWxlbWVudC50eXBlICYmIGVsZW1lbnQudHlwZSA9PT0gJ3NlbGVjdC1tdWx0aXBsZScpIHtcclxuXHRcdFx0XHRcdHZhbHVlID0gW107XHJcblx0XHRcdFx0XHRpZiAoZWxlbWVudC52YWx1ZSAmJiBlbGVtZW50Lm9wdGlvbnMpIHtcclxuXHRcdFx0XHRcdFx0T2JqZWN0LmtleXMoZWxlbWVudC5vcHRpb25zKS5mb3JFYWNoKGZ1bmN0aW9uIChvcHRpb25LZXkpIHtcclxuXHRcdFx0XHRcdFx0XHRpZiAoZWxlbWVudC5vcHRpb25zW29wdGlvbktleV0uc2VsZWN0ZWQpIHtcclxuXHRcdFx0XHRcdFx0XHRcdHZhbHVlLnB1c2goZWxlbWVudC5vcHRpb25zW29wdGlvbktleV0udmFsdWUpO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdHJldHVybiB2YWx1ZTtcclxuXHRcdFx0fVxyXG5cdFx0fSxcclxuXHRcdFxyXG5cdFx0c2VyaWFsaXplOiBmdW5jdGlvbihmb3JtKSB7XHJcblx0XHRcdHZhciBmb3JtRGF0YSA9IHtcclxuXHRcdFx0XHRmb3JtTmFtZTogZm9ybS5nZXRBdHRyaWJ1dGUoJ25hbWUnKSB8fCBudWxsLFxyXG5cdFx0XHRcdGFjdGlvbjogZm9ybS5nZXRBdHRyaWJ1dGUoJ2FjdGlvbicpIHx8IG51bGwsXHJcblx0XHRcdFx0cG9zdERhdGE6IHt9XHJcblx0XHRcdH07XHJcblx0XHRcdFxyXG5cdFx0XHRmb3JtRGF0YS5wb3N0RGF0YSA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGZvcm0uZWxlbWVudHMpLnJlZHVjZShmdW5jdGlvbiAoZGF0YSwgaXRlbSkge1xyXG5cdFx0XHRcdGlmIChpdGVtICYmIGl0ZW0ubmFtZSkge1xyXG5cdFx0XHRcdFx0aWYgKCFkYXRhW2l0ZW0ubmFtZV0pIHtcclxuXHRcdFx0XHRcdFx0ZGF0YVtpdGVtLm5hbWVdID0ge1xyXG5cdFx0XHRcdFx0XHRcdHR5cGU6IGl0ZW0udHlwZSxcclxuXHRcdFx0XHRcdFx0XHRuYW1lOiBpdGVtLm5hbWUsXHJcblx0XHRcdFx0XHRcdFx0ZWxlbWVudFR5cGU6IGl0ZW0ubm9kZU5hbWUudG9Mb3dlckNhc2UoKSxcclxuXHRcdFx0XHRcdFx0XHRyZXF1aXJlZDogaXRlbS5kYXRhc2V0LnJlcXVpcmVkID09PSAndHJ1ZScsXHJcblx0XHRcdFx0XHRcdFx0dmFsdWVDaGVjazogaXRlbS5kYXRhc2V0LnZhbHVlQ2hlY2sgfHwgaXRlbS50eXBlLFxyXG5cdFx0XHRcdFx0XHRcdHZhbHVlS2V5OiBpdGVtLmRhdGFzZXQudmFsdWVLZXkgfHwgMCxcclxuXHRcdFx0XHRcdFx0XHR2YWx1ZXM6IFtdXHJcblx0XHRcdFx0XHRcdH07XHJcblx0XHRcdFx0XHR9IGVsc2UgaWYgKHR5cGVvZiBkYXRhW2l0ZW0ubmFtZV0udmFsdWVLZXkgPT09IFwibnVtYmVyXCIgJiYgaXNGaW5pdGUoZGF0YVtpdGVtLm5hbWVdLnZhbHVlS2V5KSAmJiBNYXRoLmZsb29yKGRhdGFbaXRlbS5uYW1lXS52YWx1ZUtleSkgPT09IGRhdGFbaXRlbS5uYW1lXS52YWx1ZUtleSkge1xyXG5cdFx0XHRcdFx0XHRkYXRhW2l0ZW0ubmFtZV0udmFsdWVLZXkrKztcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0aWYgKHR5cGVvZiBtZXRob2RzLmZvcm0uZ2V0VmFsdWVPZkVsZW1lbnRbaXRlbS5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpXSA9PT0gJ2Z1bmN0aW9uJykge1xyXG5cdFx0XHRcdFx0XHRpZiAobWV0aG9kcy5mb3JtLmdldFZhbHVlT2ZFbGVtZW50W2l0ZW0ubm9kZU5hbWUudG9Mb3dlckNhc2UoKV0oaXRlbSkgJiYgaXRlbS5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpID09PSAnc2VsZWN0JyAmJiBpdGVtLnR5cGUgPT09ICdzZWxlY3QtbXVsdGlwbGUnKSB7XHJcblx0XHRcdFx0XHRcdFx0ZGF0YVtpdGVtLm5hbWVdLnZhbHVlcyA9IG1ldGhvZHMuZm9ybS5nZXRWYWx1ZU9mRWxlbWVudFtpdGVtLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCldKGl0ZW0pO1xyXG5cdFx0XHRcdFx0XHR9IGVsc2UgaWYgKG1ldGhvZHMuZm9ybS5nZXRWYWx1ZU9mRWxlbWVudFtpdGVtLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCldKGl0ZW0pKSB7XHJcblx0XHRcdFx0XHRcdFx0aWYgKGl0ZW0uZGF0YXNldC52YWx1ZUtleSkge1xyXG5cdFx0XHRcdFx0XHRcdFx0ZGF0YVtpdGVtLm5hbWVdLnZhbHVlc1tpdGVtLmRhdGFzZXQudmFsdWVLZXldID0gbWV0aG9kcy5mb3JtLmdldFZhbHVlT2ZFbGVtZW50W2l0ZW0ubm9kZU5hbWUudG9Mb3dlckNhc2UoKV0oaXRlbSk7XHJcblx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0XHRcdGRhdGFbaXRlbS5uYW1lXS52YWx1ZXMucHVzaChtZXRob2RzLmZvcm0uZ2V0VmFsdWVPZkVsZW1lbnRbaXRlbS5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpXShpdGVtKSk7XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdHJldHVybiBkYXRhO1xyXG5cdFx0XHR9LHt9KTtcclxuXHRcdFx0cmV0dXJuIGZvcm1EYXRhO1xyXG5cdFx0fVxyXG5cdH07XHJcblx0XHJcblx0bWV0aG9kcy5mb3JtVmFsaWRhdGlvbiA9IHtcclxuXHRcdGZvcm1EYXRhOiBmdW5jdGlvbihkYXRhKSB7XHJcblx0XHRcdHZhciBlcnJvckRhdGEgPSB7fTtcclxuXHRcdFx0T2JqZWN0LmtleXMoZGF0YSkuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XHJcblx0XHRcdFx0aWYgKGRhdGFba2V5XS5yZXF1aXJlZCA9PT0gdHJ1ZSkge1xyXG5cdFx0XHRcdFx0dmFyIGZpZWxkRGF0YSA9IHtcclxuXHRcdFx0XHRcdFx0bmFtZTogZGF0YVtrZXldLFxyXG5cdFx0XHRcdFx0XHR2YWx1ZXM6IGRhdGFba2V5XS52YWx1ZXNbMF0sXHJcblx0XHRcdFx0XHRcdHZhbHVlQ2hlY2s6IGRhdGFba2V5XS52YWx1ZUNoZWNrXHJcblx0XHRcdFx0XHR9O1xyXG5cdFx0XHRcdFx0dmFyIHZhbGlkYXRpb25SZXNwb25zZSA9IG1ldGhvZHMuZm9ybVZhbGlkYXRpb24uZmllbGRWYWxpZGF0aW9uKGZpZWxkRGF0YSk7XHJcblx0XHRcdFx0XHRpZiAodmFsaWRhdGlvblJlc3BvbnNlLmhhc0Vycm9yKSB7XHJcblx0XHRcdFx0XHRcdGVycm9yRGF0YVtrZXldID0ge1xyXG5cdFx0XHRcdFx0XHRcdGRhdGE6IGRhdGFba2V5XSxcclxuXHRcdFx0XHRcdFx0XHRtZXNzYWdlOiB2YWxpZGF0aW9uUmVzcG9uc2UuZXJyb3JNZXNzYWdlXHJcblx0XHRcdFx0XHRcdH07XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdFx0cmV0dXJuIChPYmplY3Qua2V5cyhlcnJvckRhdGEpLmxlbmd0aCA+IDAgPyBlcnJvckRhdGEgOiBmYWxzZSk7XHJcblx0XHR9LFxyXG5cdFx0XHJcblx0XHRmaWVsZFZhbGlkYXRpb246IGZ1bmN0aW9uKGRhdGEpIHtcclxuXHRcdFx0dmFyIHZhbGlkYXRpb25SZXNwb25zZSA9IHtcclxuXHRcdFx0XHRoYXNFcnJvcjogZmFsc2UsXHJcblx0XHRcdFx0ZXJyb3JNZXNzYWdlOiBudWxsXHJcblx0XHRcdH07XHJcblx0XHRcdFxyXG5cdFx0XHRpZiAoIW1ldGhvZHMuZm9ybVZhbGlkYXRpb24udmFsaWRhdGlvblR5cGUuaXNOb3RFbXB0eShkYXRhLnZhbHVlcykpIHtcclxuXHRcdFx0XHR2YWxpZGF0aW9uUmVzcG9uc2UuaGFzRXJyb3IgPSB0cnVlO1xyXG5cdFx0XHRcdHZhbGlkYXRpb25SZXNwb25zZS5lcnJvck1lc3NhZ2UgPSBkYXRhLm5hbWUgKyAnIGZpZWxkIGlzIGVtcHR5JztcclxuXHRcdFx0fSBlbHNlIGlmIChtZXRob2RzLmZvcm1WYWxpZGF0aW9uLnZhbGlkYXRpb25UeXBlLmlzTm90RW1wdHkoZGF0YS52YWx1ZXMpICYmIHR5cGVvZiBtZXRob2RzLmZvcm1WYWxpZGF0aW9uLnZhbGlkYXRpb25UeXBlW2RhdGEudmFsdWVDaGVja10gPT09ICdmdW5jdGlvbicpIHtcclxuXHRcdFx0XHRpZiAoIW1ldGhvZHMuZm9ybVZhbGlkYXRpb24udmFsaWRhdGlvblR5cGVbZGF0YS52YWx1ZUNoZWNrXShkYXRhLnZhbHVlcykpIHtcclxuXHRcdFx0XHRcdHZhbGlkYXRpb25SZXNwb25zZS5oYXNFcnJvciA9IHRydWU7XHJcblx0XHRcdFx0XHR2YWxpZGF0aW9uUmVzcG9uc2UuZXJyb3JNZXNzYWdlID0gZGF0YS5uYW1lICsgJyBmaWVsZCBpcyBub3QgY29ycmVjdCBmaWxsZWQnO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm4gdmFsaWRhdGlvblJlc3BvbnNlO1xyXG5cdFx0fSxcclxuXHRcdFxyXG5cdFx0dmFsaWRhdGlvblR5cGU6IHtcclxuXHRcdFx0aXNOb3RFbXB0eTogZnVuY3Rpb24odmFsdWUpIHtcclxuXHRcdFx0XHR2YXIgdmFsdWVJc05vdEVtcHR5ID0gdHJ1ZTtcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRpZiAodmFsdWUgPT09IHVuZGVmaW5lZCkge1xyXG5cdFx0XHRcdFx0dmFsdWVJc05vdEVtcHR5ID0gZmFsc2U7XHJcblx0XHRcdFx0fSBlbHNlICBpZiAoKHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgJiYgT2JqZWN0LmtleXModmFsdWUpLmxlbmd0aCA+IDApIHx8IHZhbHVlLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0XHRcdHZhbHVlSXNOb3RFbXB0eSA9IHRydWU7XHJcblx0XHRcdFx0XHR2YWx1ZUlzTm90RW1wdHkgPSB0cnVlO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHR2YWx1ZUlzTm90RW1wdHkgPSBmYWxzZTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0cmV0dXJuIHZhbHVlSXNOb3RFbXB0eTtcclxuXHRcdFx0fSxcclxuXHRcdFx0XHJcblx0XHRcdHRleHQ6IGZ1bmN0aW9uKHZhbHVlKSB7XHJcblx0XHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHRcdH0sXHJcblx0XHRcdFxyXG5cdFx0XHRudW1iZXI6IGZ1bmN0aW9uKHZhbHVlKSB7XHJcblx0XHRcdFx0dmFyIHBhdHRlcm4gPSAvXlxcZCskLztcclxuXHRcdFx0XHRyZXR1cm4gcGF0dGVybi50ZXN0KHZhbHVlKTtcclxuXHRcdFx0fSxcclxuXHRcdFx0XHJcblx0XHRcdGFscGhhYmV0aWM6IGZ1bmN0aW9uKHZhbHVlKSB7XHJcblx0XHRcdFx0dmFyIHBhdHRlcm4gPSAvXlxcZCskLztcclxuXHRcdFx0XHRyZXR1cm4gIXBhdHRlcm4udGVzdCh2YWx1ZSk7XHJcblx0XHRcdH0sXHJcblx0XHRcdFxyXG5cdFx0XHRlbWFpbDogZnVuY3Rpb24odmFsdWUpIHtcclxuXHRcdFx0XHR2YXIgcGF0dGVybiA9IC9eKFtcXHctXSsoPzpcXC5bXFx3LV0rKSopQCgoPzpbXFx3LV0rXFwuKSpcXHdbXFx3LV17MCw2Nn0pXFwuKFthLXpdezIsNn0oPzpcXC5bYS16XXsyfSk/KSQvaTtcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRyZXR1cm4gcGF0dGVybi50ZXN0KHZhbHVlKTtcclxuXHRcdFx0fSxcclxuXHRcdFx0XHJcblx0XHRcdHRlbDogZnVuY3Rpb24odmFsdWUpIHtcclxuXHRcdFx0XHR2YXIgcGF0dGVybiA9IC9eKD86XFwrXFxkezEsM318MFxcZHsxLDN9fDAwXFxkezEsMn0pPyg/Olxccz9cXChcXGQrXFwpKT8oPzpbLVxcL1xccy5dfFxcZCkrJC87XHJcblx0XHRcdFx0cmV0dXJuIHBhdHRlcm4udGVzdCh2YWx1ZSk7XHJcblx0XHRcdH0sXHJcblx0XHRcdFxyXG5cdFx0XHRkYXRlRnV0dXJlOiBmdW5jdGlvbihkYXRlKSB7XHJcblx0XHRcdFx0ZGF0ZS5kYXkgPSBwYXJzZUludChkYXRlLmRheSwgMTApO1xyXG5cdFx0XHRcdGRhdGUubW9udGggPSBwYXJzZUludChkYXRlLm1vbnRoLCAxMCkgLSAxO1xyXG5cdFx0XHRcdGRhdGUueWVhciA9IHBhcnNlSW50KGRhdGUueWVhciwgMTApICsgMjAwMDtcclxuXHRcdFx0XHRcclxuXHRcdFx0XHR2YXIgdGVtcCA9IG5ldyBEYXRlKGRhdGUueWVhciwgZGF0ZS5tb250aCwgZGF0ZS5kYXkpO1xyXG5cdFx0XHRcdHZhciBub3cgPSBuZXcgRGF0ZSgpO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdGlmIChub3cgPCB0ZW1wICYmIHRlbXAuZ2V0RGF0ZSgpID09PSBkYXRlLmRheSAmJiB0ZW1wLmdldE1vbnRoKCkgPT09IGRhdGUubW9udGggJiYgdGVtcC5nZXRGdWxsWWVhcigpID09PSBkYXRlLnllYXIpIHtcclxuXHRcdFx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0fVxyXG5cdH07XHJcblx0XHJcblx0bWV0aG9kcy5zZW5kRGF0YSA9IHtcclxuXHRcdHhocjogZnVuY3Rpb24obWV0aG9kLCB1cmwsIGRhdGEpIHtcclxuXHRcdFx0LypcclxuXHRcdFx0dmFyIHByb21pc2UgPSBuZXcgUHJvbWlzZSggZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xyXG5cdFx0XHRcdHZhciByZXF1ZXN0ID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XHJcblx0XHRcdFx0cmVxdWVzdC5vcGVuKG1ldGhvZCwgdXJsKTtcclxuXHRcdFx0XHRyZXF1ZXN0LnNldFJlcXVlc3RIZWFkZXIoXCJDb250ZW50LVR5cGVcIixcImFwcGxpY2F0aW9uL2pzb247IGNoYXJzZXQ9dXRmLThcIik7XHJcblx0XHRcdFx0cmVxdWVzdC5zZW5kKEpTT04uc3RyaW5naWZ5KGRhdGEpKTtcclxuXHRcdFx0XHRyZXF1ZXN0Lm9ubG9hZCA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0XHRcdGlmIChyZXF1ZXN0LnN0YXR1cyA9PT0gMjAwKSB7XHJcblx0XHRcdFx0XHRcdHJlc29sdmUocmVxdWVzdC5yZXNwb25zZSk7XHJcblx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRyZWplY3QocmVxdWVzdC5zdGF0dXNUZXh0KTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9O1xyXG5cdFx0XHRcdHJlcXVlc3Qub25lcnJvciA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0XHRcdHJlamVjdChyZXF1ZXN0LnN0YXR1c1RleHQpO1xyXG5cdFx0XHRcdH07XHJcblx0XHRcdH0pO1xyXG5cdFx0XHRyZXR1cm4gcHJvbWlzZTtcclxuXHRcdH0sXHJcblx0XHRjYWxsYmFjazoge1xyXG5cdFx0XHRzdWNjZXNzOiBmdW5jdGlvbihkYXRhKXtcclxuXHRcdFx0XHRyZXR1cm4gSlNPTi5wYXJzZShkYXRhKTtcclxuXHRcdFx0fSxcclxuXHRcdFx0ZXJyb3I6IGZ1bmN0aW9uKGRhdGEpe1xyXG5cdFx0XHRcdC8vY29uc29sZS5lcnJvcihkYXRhKTtcclxuXHRcdFx0fVxyXG5cdFx0XHQqL1xyXG5cdFx0fVxyXG5cdH07XHJcblx0XHJcblx0bWV0aG9kcy5lcnJvck1lc3NhZ2UgPSB7XHJcblx0XHRzZXRTdGF0ZToge1xyXG5cdFx0XHRoaWRkZW46IGZ1bmN0aW9uKGVsZW1lbnQpIHtcclxuXHRcdFx0XHR2YXIgZGF0YSA9IHtcclxuXHRcdFx0XHRcdGVsZW1lbnQ6IGVsZW1lbnQucXVlcnlTZWxlY3RvcihzZWxlY3RvcnMuZXJyb3JNZXNzYWdlQ29udGFpbmVyKSxcclxuXHRcdFx0XHRcdGF0dHJpYnV0ZUtleTogJ3N0YXRlJyxcclxuXHRcdFx0XHRcdGFkZEF0dHJpYnV0ZVZhbHVlOiAnaGlkZGVuJyxcclxuXHRcdFx0XHRcdHJlbW92ZUF0dHJpYnV0ZVZhbHVlOiAnYWN0aXZlJ1xyXG5cdFx0XHRcdH07XHJcblx0XHRcdFx0bWV0aG9kcy5lcnJvck1lc3NhZ2UudG9nZ2xlU3RhdGUoZGF0YSk7XHJcblx0XHRcdH0sXHJcblx0XHRcdGFjdGl2ZTogZnVuY3Rpb24oZWxlbWVudCkge1xyXG5cdFx0XHRcdHZhciBkYXRhID0ge1xyXG5cdFx0XHRcdFx0ZWxlbWVudDogZWxlbWVudC5xdWVyeVNlbGVjdG9yKHNlbGVjdG9ycy5lcnJvck1lc3NhZ2VDb250YWluZXIpLFxyXG5cdFx0XHRcdFx0YXR0cmlidXRlS2V5OiAnc3RhdGUnLFxyXG5cdFx0XHRcdFx0YWRkQXR0cmlidXRlVmFsdWU6ICdhY3RpdmUnLFxyXG5cdFx0XHRcdFx0cmVtb3ZlQXR0cmlidXRlVmFsdWU6ICdoaWRkZW4nXHJcblx0XHRcdFx0fTtcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRtZXRob2RzLmVycm9yTWVzc2FnZS50b2dnbGVTdGF0ZShkYXRhKTtcclxuXHRcdFx0fVxyXG5cdFx0fSxcclxuXHRcdGdldFN0YXRlOiBmdW5jdGlvbihlbGVtZW50KSB7XHJcblx0XHRcdHJldHVybiBlbGVtZW50LnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3JzLmVycm9yTWVzc2FnZUNvbnRhaW5lcikuZ2V0QXR0cmlidXRlKCdzdGF0ZScpO1xyXG5cdFx0fSxcclxuXHRcdHRvZ2dsZVN0YXRlOiBmdW5jdGlvbihkYXRhKSB7XHJcblx0XHRcdG1ldGhvZHMuaHRtbEVsZW1lbnQudG9nZ2xlQXR0cmlidXRlVmFsdWUoZGF0YSk7XHJcblx0XHR9XHJcblx0fTtcclxuXHRcclxuXHRtZXRob2RzLmRhdGVTZWxlY3RvciA9IHtcclxuXHRcdGZ1bGxDaGFuZ2VIYW5kbGVyOiBmdW5jdGlvbiAoZXZlbnQpIHtcclxuXHRcdFx0dmFyIGRhdGUgPSBtZXRob2RzLmRhdGVTZWxlY3Rvci5jb252ZXJ0RnVsbFRvU2VwZXJhdGVkKGVsZW1lbnRzLmRhdGVTZWxlY3RvckZ1bGxEYXRlLnZhbHVlKTtcclxuXHRcdFx0ZWxlbWVudHMuZGF0ZVNlbGVjdG9yRGF5LnZhbHVlID0gZGF0ZS5kYXk7XHJcblx0XHRcdGVsZW1lbnRzLmRhdGVTZWxlY3Rvck1vbnRoLnZhbHVlID0gZGF0ZS5tb250aDtcclxuXHRcdFx0ZWxlbWVudHMuZGF0ZVNlbGVjdG9yWWVhci52YWx1ZSA9IGRhdGUueWVhci50b1N0cmluZygpLnNsaWNlKC0yKTtcclxuXHRcdH0sXHJcblx0XHRcclxuXHRcdGNoYW5nZUhhbmRsZXI6IGZ1bmN0aW9uIChldmVudCkge1xyXG5cdFx0XHR2YXIgZWxlbWVudDtcclxuXHJcblx0XHRcdC8vIGNhbmNlbCBrZXl1cC1ldmVudCBpZiBrZXkgd2FzIG5vdCBhIG51bWJlciBvciBUQUIgb3IgRU5URVJcclxuXHRcdFx0aWYgKG1ldGhvZHMuZGF0ZVNlbGVjdG9yLnRlc3RLZXlVcEV2ZW50KGV2ZW50KSkge1xyXG5cdFx0XHRcdG1ldGhvZHMuZGF0ZVNlbGVjdG9yLnRlc3RWYWx1ZXMoKTtcclxuXHRcdFx0XHRtZXRob2RzLmRhdGVTZWxlY3Rvci5hcHBseVN0YXRlKCk7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0aWYgKGV2ZW50LnR5cGUgPT09ICdrZXl1cCcgfHwgZXZlbnQudHlwZSA9PT0gJ2tleWRvd24nKSB7XHJcblx0XHRcdFx0XHRlbGVtZW50ID0gZXZlbnQuY3VycmVudFRhcmdldDtcclxuXHRcdFx0XHRcdGlmICgoZWxlbWVudC52YWx1ZS5sZW5ndGggPj0gbWV0aG9kcy5kYXRlU2VsZWN0b3IubWF4SW5wdXRMZW5ndGgoZWxlbWVudCkpICYmIChldmVudC5rZXlDb2RlICE9PSAxNikgJiYgKGV2ZW50LmtleUNvZGUgIT09IDkpICYmIChldmVudC5rZXlDb2RlICE9PSA4KSkge1xyXG5cdFx0XHRcdFx0XHRtZXRob2RzLmRhdGVTZWxlY3Rvci5qdW1wVG9OZXh0SW5wdXQoZWxlbWVudCk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdC8vIHRoaXMgaXMgYSBrZXlkb3duIGJlaW5nIGNhbmNlbGxlZCwgdGh1cyBubyBrZXl1cCBvY2N1cnMgb24gdGhpcyAnY2hhbmdlJ1xyXG5cdFx0XHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcblx0XHRcdFx0ZXZlbnQuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XHJcblx0XHRcdH1cclxuXHRcdH0sXHJcblx0XHRcclxuXHRcdHRlc3RWYWx1ZXM6IGZ1bmN0aW9uIChldmVudCkge1xyXG5cdFx0XHRzdGF0ZS5hZ2UgPSB7XHJcblx0XHRcdFx0ZGF5OiBlbGVtZW50cy5kYXRlU2VsZWN0b3JEYXkudmFsdWUsXHJcblx0XHRcdFx0bW9udGg6IGVsZW1lbnRzLmRhdGVTZWxlY3Rvck1vbnRoLnZhbHVlLFxyXG5cdFx0XHRcdHllYXI6IGVsZW1lbnRzLmRhdGVTZWxlY3RvclllYXIudmFsdWVcclxuXHRcdFx0fTtcclxuXHRcdFx0XHJcblx0XHRcdGlmIChzdGF0ZS5hZ2UuZGF5ICYmIHN0YXRlLmFnZS5tb250aCAmJiBzdGF0ZS5hZ2UueWVhcikge1xyXG5cdFx0XHRcdGlmIChtZXRob2RzLmZvcm1WYWxpZGF0aW9uLnZhbGlkYXRpb25UeXBlLmRhdGVGdXR1cmUoc3RhdGUuYWdlKSkge1xyXG5cdFx0XHRcdFx0c3RhdGUuYWdlU3RhdGUgPSAndmFsaWQnO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRzdGF0ZS5hZ2VTdGF0ZSA9ICdpbnZhbGlkJztcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0gZWxzZSBpZiAoc3RhdGUuYWdlLmRheSB8fCBzdGF0ZS5hZ2UubW9udGggfHwgc3RhdGUuYWdlLnllYXIpIHtcclxuXHRcdFx0XHRzdGF0ZS5hZ2VTdGF0ZSA9ICdwcm9ncmVzcyc7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0c3RhdGUuYWdlU3RhdGUgPSAnaW5pdGlhbCc7XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdHJldHVybiAoc3RhdGUuYWdlU3RhdGUgPT09ICd2YWxpZCcpO1xyXG5cdFx0fSxcclxuXHRcdFxyXG5cdFx0dGVzdEZ1bGxEYXRlU3VwcG9ydDogZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRyZXR1cm4gKGVsZW1lbnRzLmRhdGVTZWxlY3RvckZ1bGxEYXRlLnR5cGUgPT09ICdkYXRlJyk7XHJcblx0XHR9LFxyXG5cdFx0XHJcblx0XHR0ZXN0S2V5VXBFdmVudDogZnVuY3Rpb24gKGV2ZW50KSB7XHJcblx0XHRcdHZhciBpc0tleVVwID0gKGV2ZW50LnR5cGUgPT09ICdrZXlkb3duJyk7XHJcblx0XHRcdHZhciBpc1RhYiA9IChldmVudC5rZXlDb2RlID09PSA5KTtcclxuXHRcdFx0dmFyIGlzRW50ZXIgPSAoZXZlbnQua2V5Q29kZSA9PT0gMTMpO1xyXG5cdFx0XHR2YXIgaXNCYWNrc3BhY2UgPSAoZXZlbnQua2V5Q29kZSA9PT0gOCk7XHJcblx0XHRcdHZhciBpc0RlbGV0ZSA9IChldmVudC5rZXlDb2RlID09PSA0Nik7XHJcblx0XHRcdHZhciBpc051bWVyaWMgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGV2ZW50LmtleUNvZGUpLm1hdGNoKC9bMC05XS8pO1xyXG5cdFx0XHR2YXIgaXNOdW1wYWQgPSAoZXZlbnQua2V5Q29kZSA+PSA5NikgJiYgKGV2ZW50LmtleUNvZGUgPD0gMTA1KTtcclxuXHRcdFx0dmFyIGlzTnVtQW5kcm9pZCA9IChldmVudC5rZXlDb2RlID09PSAyMjkpO1xyXG5cdFx0XHRcclxuXHRcdFx0aWYgKCFpc0tleVVwKSB7XHJcblx0XHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdGlmIChpc0tleVVwICYmIChpc1RhYiB8fCBpc0VudGVyIHx8IGlzTnVtZXJpYyB8fCBpc0JhY2tzcGFjZSB8fCBpc0RlbGV0ZSB8fCBpc051bXBhZCB8fCBpc051bUFuZHJvaWQpKSB7XHJcblx0XHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0XHR9XHJcblx0XHR9LFxyXG5cdFx0XHJcblx0XHRjb252ZXJ0RnVsbFRvU2VwZXJhdGVkOiBmdW5jdGlvbiAodmFsdWUpIHtcclxuXHRcdFx0dmFsdWUgPSBuZXcgRGF0ZSh2YWx1ZSk7XHJcblx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0ZGF5OiB2YWx1ZS5nZXREYXRlKCksXHJcblx0XHRcdFx0bW9udGg6IHZhbHVlLmdldE1vbnRoKCkgKyAxLFxyXG5cdFx0XHRcdHllYXI6IHZhbHVlLmdldEZ1bGxZZWFyKClcclxuXHRcdFx0fTtcclxuXHRcdH0sXHJcblx0XHRcclxuXHRcdGNoZWNrSW5wdXRMZW5ndGg6IGZ1bmN0aW9uKGN1cnJlbnRFbGVtZW50KSB7XHJcblx0XHRcdHJldHVybiBjdXJyZW50RWxlbWVudC52YWx1ZS5sZW5ndGg7XHJcblx0XHR9LFxyXG5cdFx0XHJcblx0XHRtYXhJbnB1dExlbmd0aDogZnVuY3Rpb24oZWxlbWVudCkge1xyXG5cdFx0XHRyZXR1cm4gZWxlbWVudC5nZXRBdHRyaWJ1dGUoJ21heGxlbmd0aCcpO1xyXG5cdFx0fSxcclxuXHRcdFxyXG5cdFx0bmV4dElucHV0OiBmdW5jdGlvbihjdXJyZW50RWxlbWVudCkge1xyXG5cdFx0XHRyZXR1cm4gY3VycmVudEVsZW1lbnQuZ2V0QXR0cmlidXRlKCdkYXRhLW5leHRmaWVsZCcpO1xyXG5cdFx0fSxcclxuXHRcdFxyXG5cdFx0anVtcFRvTmV4dElucHV0OiBmdW5jdGlvbihjdXJyZW50RWxlbWVudCkge1xyXG5cdFx0XHR2YXIgbmV4dElucHV0RGF0YSA9IG1ldGhvZHMuZGF0ZVNlbGVjdG9yLm5leHRJbnB1dChjdXJyZW50RWxlbWVudCk7XHJcblx0XHRcdGlmIChuZXh0SW5wdXREYXRhICE9PSBudWxsKSB7XHJcblx0XHRcdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQobmV4dElucHV0RGF0YSkuZm9jdXMoKTtcclxuXHRcdFx0fVxyXG5cdFx0fSxcclxuXHRcdFxyXG5cdFx0ZGF0ZUlucHV0OiBmdW5jdGlvbihvcHRpb25zKSB7XHJcblx0XHRcdHZhciBjdXJyZW50ID0gb3B0aW9ucy5jdXJyZW50O1xyXG5cdFx0XHR2YXIgY3VycmVudEtleUNvZGUgPSBvcHRpb25zLmtleUNvZGU7XHJcblx0XHRcdHZhciBpbnB1dExlbmd0aCA9IG1ldGhvZHMuZGF0ZVNlbGVjdG9yLmNoZWNrSW5wdXRMZW5ndGgoY3VycmVudCk7XHJcblx0XHRcdHZhciBtYXhJbnB1dExlbmd0aCA9IG1ldGhvZHMuZGF0ZVNlbGVjdG9yLm1heElucHV0TGVuZ3RoKGN1cnJlbnQpO1xyXG5cdFx0XHRcclxuXHRcdFx0aWYgKChpbnB1dExlbmd0aCA9PSBtYXhJbnB1dExlbmd0aCkgJiYgKGN1cnJlbnRLZXlDb2RlICE9PSAxNikgJiYgKGN1cnJlbnRLZXlDb2RlICE9PSA5KSkge1xyXG5cdFx0XHRcdG1ldGhvZHMuZGF0ZVNlbGVjdG9yLmp1bXBUb05leHRJbnB1dChjdXJyZW50KTtcclxuXHRcdFx0fVxyXG5cdFx0fSxcclxuXHRcdFxyXG5cdFx0YXBwbHlTdGF0ZTogZnVuY3Rpb24gKGlucHV0KSB7XHJcblx0XHRcdGlmIChpbnB1dCkge1xyXG5cdFx0XHRcdGVsZW1lbnRzLmRhdGVTZWxlY3RvckNvbnRhaW5lci5zZXRBdHRyaWJ1dGUoJ3N0YXRlJywgaW5wdXQpO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdG1ldGhvZHMuZGF0ZVNlbGVjdG9yLnRlc3RWYWx1ZXMoKTtcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRlbGVtZW50cy5kYXRlU2VsZWN0b3JDb250YWluZXIuc2V0QXR0cmlidXRlKCdzdGF0ZScsIHN0YXRlLmFnZVN0YXRlKTtcclxuXHRcdFx0fVxyXG5cdFx0fSxcclxuXHRcdFxyXG5cdFx0Z2V0Q29udGFpbmVyOiBmdW5jdGlvbihlbGVtZW50KSB7XHJcblx0XHRcdHJldHVybiBlbGVtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3JzLmRhdGVGaWVsZENvbnRhaW5lcikgfHwgZmFsc2U7XHJcblx0XHR9LFxyXG5cdFx0XHJcblx0XHRpc1N0YXRlSW52YWxpZDogZnVuY3Rpb24oZWxlbWVudCkge1xyXG5cdFx0XHR2YXIgZGF0ZUNvbnRhaW5lcnMgPSBtZXRob2RzLmRhdGVTZWxlY3Rvci5nZXRDb250YWluZXIoZWxlbWVudCk7XHJcblx0XHRcdHN0YXRlLmNvbnRhaW5lclZhcmlhbnREYXRlSW52YWxpZCA9IGZhbHNlO1xyXG5cdFx0XHRpZiAoZGF0ZUNvbnRhaW5lcnMpIHtcclxuXHRcdFx0XHRbXS5zbGljZS5jYWxsKGRhdGVDb250YWluZXJzKS5mb3JFYWNoKGZ1bmN0aW9uIChpdGVtKSB7XHJcblx0XHRcdFx0XHRpZiAoaXRlbS5nZXRBdHRyaWJ1dGUoJ3N0YXRlJykgIT09ICd2YWxpZCcpIHtcclxuXHRcdFx0XHRcdFx0c3RhdGUuY29udGFpbmVyVmFyaWFudERhdGVJbnZhbGlkID0gdHJ1ZTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm4gc3RhdGUuY29udGFpbmVyVmFyaWFudERhdGVJbnZhbGlkO1xyXG5cdFx0fVxyXG5cdH07XHJcblx0XHJcblx0bWV0aG9kcy5tb3VudCA9IGZ1bmN0aW9uICh2aWV3cG9ydCkge1xyXG5cdFx0dmlld3BvcnQgPSB2aWV3cG9ydCB8fCBkb2N1bWVudDtcclxuXHRcdHZhciBmb3VuZCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3JzLmNvbnRhaW5lcik7XHJcblx0XHRcclxuXHRcdGlmIChmb3VuZCkge1xyXG5cdFx0XHRlbGVtZW50cy53aW5kb3cgPSB3aW5kb3c7XHJcblx0XHRcdGVsZW1lbnRzLmJvZHkgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdib2R5Jyk7XHJcblx0XHRcdGVsZW1lbnRzLnZpZXdwb3J0ID0gdmlld3BvcnQgfHwgZG9jdW1lbnQucXVlcnlTZWxlY3RvcihzZWxlY3RvcnMudmlld3BvcnQpO1xyXG5cdFx0XHRlbGVtZW50cy5mb3JtQ29udGFpbmVyID0gZm91bmQ7XHJcblx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0fVxyXG5cdH07XHJcblx0XHJcblx0bWV0aG9kcy5pbml0ID0gZnVuY3Rpb24odmlld3BvcnQpIHtcclxuXHRcdGlmIChlbGVtZW50cy5mb3JtQ29udGFpbmVyKSB7XHJcblx0XHRcdGVsZW1lbnRzLmZvcm1FbGVtZW50ID0gZWxlbWVudHMuZm9ybUNvbnRhaW5lci5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9ycy5mb3JtRWxlbWVudCk7XHJcblx0XHRcdGVsZW1lbnRzLnJlcXVpcmVkRmllbGRzID0gZWxlbWVudHMuZm9ybUNvbnRhaW5lci5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9ycy5yZXF1aXJlZEZpZWxkcyk7XHJcblx0XHRcdGVsZW1lbnRzLnBvc3RlZENvbnRhaW5lcnMgPSBlbGVtZW50cy5mb3JtQ29udGFpbmVyLnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3JzLmZvcm1Qb3N0ZWRDb250YWluZXIpO1xyXG5cdFx0XHRcclxuXHRcdFx0ZWxlbWVudHMuZGF0ZVNlbGVjdG9yQ29udGFpbmVyID0gZWxlbWVudHMuZm9ybUNvbnRhaW5lci5xdWVyeVNlbGVjdG9yKCdbdmFyaWFudCo9XCJkYXRlXCJdJyk7XHJcblx0XHRcdGlmIChlbGVtZW50cy5kYXRlU2VsZWN0b3JDb250YWluZXIpIHtcclxuXHRcdFx0XHRlbGVtZW50cy5kYXRlU2VsZWN0b3JEYXkgPSBlbGVtZW50cy5kYXRlU2VsZWN0b3JDb250YWluZXIucXVlcnlTZWxlY3RvcignW3ZhcmlhbnQqPVwiZGF5XCJdJyk7XHJcblx0XHRcdFx0ZWxlbWVudHMuZGF0ZVNlbGVjdG9yTW9udGggPSBlbGVtZW50cy5kYXRlU2VsZWN0b3JDb250YWluZXIucXVlcnlTZWxlY3RvcignW3ZhcmlhbnQqPVwibW9udGhcIl0nKTtcclxuXHRcdFx0XHRlbGVtZW50cy5kYXRlU2VsZWN0b3JZZWFyID1cdGVsZW1lbnRzLmRhdGVTZWxlY3RvckNvbnRhaW5lci5xdWVyeVNlbGVjdG9yKCdbdmFyaWFudCo9XCJ5ZWFyXCJdJyk7XHJcblx0XHRcdFx0ZWxlbWVudHMuZGF0ZVNlbGVjdG9yRnVsbERhdGUgPVx0ZWxlbWVudHMuZGF0ZVNlbGVjdG9yQ29udGFpbmVyLnF1ZXJ5U2VsZWN0b3IoJ1t2YXJpYW50Kj1cImZ1bGxcIl0nKTtcclxuXHRcdFx0XHRlbGVtZW50cy5kYXRlU2VsZWN0b3IgPVx0ZWxlbWVudHMuZGF0ZVNlbGVjdG9yQ29udGFpbmVyLnF1ZXJ5U2VsZWN0b3JBbGwoJ1t2YXJpYW50Kj1cImRhdGVzZWxlY3RvclwiXScpO1xyXG5cdFx0XHRcdGVsZW1lbnRzLmRhdGVTZWxlY3RvckFsbEZpZWxkcyA9IGVsZW1lbnRzLmRhdGVTZWxlY3RvckNvbnRhaW5lci5xdWVyeVNlbGVjdG9yQWxsKCcuaW5wdXQnKTtcclxuXHRcdFx0XHRzdGF0ZS5mdWxsRGF0ZVN1cHBvcnQgPSBtZXRob2RzLmRhdGVTZWxlY3Rvci50ZXN0RnVsbERhdGVTdXBwb3J0KCk7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0c3RhdGUuaXNNb2JpbGUgPSAoZWxlbWVudHMud2luZG93LmlubmVyV2lkdGggPCA3MDApO1xyXG5cdFx0XHRcdGlmIChlbGVtZW50cy5kYXRlU2VsZWN0b3JGdWxsRGF0ZSAmJiBzdGF0ZS5mdWxsRGF0ZVN1cHBvcnQgJiYgc3RhdGUuaXNNb2JpbGUpIHtcclxuXHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0ZWxlbWVudHMuZGF0ZVNlbGVjdG9yRnVsbERhdGUuc2V0QXR0cmlidXRlKCdzdGF0ZScsICdhY3RpdmUnKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0dmFyIGRhdGVTZWxlY3RvciA9IFtlbGVtZW50cy5kYXRlU2VsZWN0b3JEYXksIGVsZW1lbnRzLmRhdGVTZWxlY3Rvck1vbnRoLCBlbGVtZW50cy5kYXRlU2VsZWN0b3JZZWFyXTtcclxuXHRcclxuXHRcdFx0XHRPYmplY3Qua2V5cyhkYXRlU2VsZWN0b3IpLmZvckVhY2goIGZ1bmN0aW9uIChrZXkpIHtcclxuXHRcdFx0XHRcdGRhdGVTZWxlY3RvcltrZXldLmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCAgbWV0aG9kcy5kYXRlU2VsZWN0b3IuY2hhbmdlSGFuZGxlcik7XHJcblx0XHRcdFx0XHRkYXRlU2VsZWN0b3Jba2V5XS5hZGRFdmVudExpc3RlbmVyKCdrZXl1cCcsICBtZXRob2RzLmRhdGVTZWxlY3Rvci5jaGFuZ2VIYW5kbGVyKTtcclxuXHRcdFx0XHRcdGRhdGVTZWxlY3RvcltrZXldLmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsICBtZXRob2RzLmRhdGVTZWxlY3Rvci5jaGFuZ2VIYW5kbGVyKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0T2JqZWN0LmtleXMoZWxlbWVudHMuZm9ybUVsZW1lbnQpLmZvckVhY2goIGZ1bmN0aW9uIChrZXkpIHtcclxuXHRcdFx0XHRlbGVtZW50cy5mb3JtRWxlbWVudFtrZXldLmFkZEV2ZW50TGlzdGVuZXIoJ3N1Ym1pdCcsIG1ldGhvZHMuZm9ybS5jbGlja0hhbmRsZXIpO1xyXG5cdFx0XHR9KTtcclxuXHRcdFx0XHJcblx0XHRcdE9iamVjdC5rZXlzKGVsZW1lbnRzLnJlcXVpcmVkRmllbGRzKS5mb3JFYWNoKCBmdW5jdGlvbiAoa2V5KSB7XHJcblx0XHRcdFx0ZWxlbWVudHMucmVxdWlyZWRGaWVsZHNba2V5XS5hZGRFdmVudExpc3RlbmVyKCdmb2N1c2luJywgbWV0aG9kcy5maWVsZEVsZW1lbnQuZm9jdXNJbik7XHJcblx0XHRcdFx0ZWxlbWVudHMucmVxdWlyZWRGaWVsZHNba2V5XS5hZGRFdmVudExpc3RlbmVyKCdmb2N1c291dCcsIG1ldGhvZHMuZmllbGRFbGVtZW50LmZvY3VzT3V0KTtcclxuXHRcdFx0fSk7XHJcblx0XHRcdFxyXG5cdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdH1cclxuXHR9O1xyXG5cdFxyXG5cdG1ldGhvZHMucmVuZGVyID0gZnVuY3Rpb24gKHZpZXdwb3J0KSB7XHJcblx0XHRpZiAoZWxlbWVudHMuZm9ybUNvbnRhaW5lcikge1xyXG5cdFx0XHRcclxuXHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHR9XHJcblx0fTtcclxuXHRcclxuXHRtZXRob2RzLnVubW91bnQgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRpZiAoZWxlbWVudHMuZm9ybUNvbnRhaW5lcikge1xyXG5cdFx0XHQkKGVsZW1lbnRzLmZvcm1FbGVtZW50KS5vZmYoJ3N1Ym1pdCcsIG1ldGhvZHMuZm9ybS5jbGlja0hhbmRsZXIpO1xyXG5cdFx0XHQkKGVsZW1lbnRzLmRhdGVTZWxlY3RvckFsbEZpZWxkcykub24oJ2NsaWNrJywgbWV0aG9kcy5kYXRlU2VsZWN0b3Iuc2V0Rm9jdXMpO1xyXG5cdFx0XHQkKGVsZW1lbnRzLmRhdGVTZWxlY3RvckZ1bGxEYXRlKS5vbignY2hhbmdlJywgbWV0aG9kcy5kYXRlU2VsZWN0b3IuZnVsbENoYW5nZUhhbmRsZXIpO1xyXG5cdFx0fVxyXG5cdH07XHJcblx0XHJcblx0cmV0dXJuIHtcclxuXHRcdG1vdW50OiBtZXRob2RzLm1vdW50LFxyXG5cdFx0aW5pdDogbWV0aG9kcy5pbml0LFxyXG5cdFx0dW5tb3VudDogbWV0aG9kcy51bm1vdW50LFxyXG5cdFx0cmVuZGVyOiBtZXRob2RzLnJlbmRlcixcclxuXHRcdFxyXG5cdFx0c2VsZWN0b3I6IHNlbGVjdG9ycy5jb250YWluZXJcclxuXHR9O1xyXG59KCkpOyIsIm1ldGhvZHMubW9kdWxlcyA9IHtcclxuXHQnaW5pdEFsbCc6IGZ1bmN0aW9uICh2aWV3cG9ydCkge1xyXG5cdFx0T2JqZWN0LmtleXMobW9kdWxlcykuZm9yRWFjaCggZnVuY3Rpb24gKG1vZHVsZU5hbWUsIGtleSkge1xyXG5cdFx0XHR0cnkge1xyXG5cdFx0XHRcdGlmIChtb2R1bGVzW21vZHVsZU5hbWVdLmluaXQpIHtcclxuXHRcdFx0XHRcdHZhciBleGlzdGVkID0gbW9kdWxlc1ttb2R1bGVOYW1lXS5pbml0KHZpZXdwb3J0KTtcclxuXHRcdFx0XHRcdGlmIChleGlzdGVkKSB7XHJcblx0XHRcdFx0XHRcdC8vIGNvbnNvbGUuaW5mbygnaW5pdGlhbGlzZWQgbW9kdWxlOiAnLCBtb2R1bGVOYW1lKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdFx0Ly8gY29uc29sZS53YXJuKCdmYWlsZWQgdG8gaW5pdCBtb2R1bGU6ICcsIG1vZHVsZU5hbWUpO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHR9LFxyXG5cdCdtb3VudEFsbCc6IGZ1bmN0aW9uICh2aWV3cG9ydCkge1xyXG5cdFx0T2JqZWN0LmtleXMobW9kdWxlcykuZm9yRWFjaCggZnVuY3Rpb24gKG1vZHVsZU5hbWUsIGtleSkge1xyXG5cdFx0XHR0cnkge1xyXG5cdFx0XHRcdGlmIChtb2R1bGVzW21vZHVsZU5hbWVdLm1vdW50KSB7XHJcblx0XHRcdFx0XHR2YXIgZXhpc3RlZCA9IG1vZHVsZXNbbW9kdWxlTmFtZV0ubW91bnQodmlld3BvcnQpO1xyXG5cdFx0XHRcdFx0aWYgKGV4aXN0ZWQpIHtcclxuXHRcdFx0XHRcdFx0Ly9jb25zb2xlLmluZm8oJ21vdW50ZWQgbW9kdWxlOiAnLCBtb2R1bGVOYW1lKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdFx0Ly8gY29uc29sZS53YXJuKCdmYWlsZWQgdG8gbW91bnQgbW9kdWxlOiAnLCBtb2R1bGVOYW1lKTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblx0fSxcclxuXHQndW5tb3VudEFsbCc6IGZ1bmN0aW9uICgpIHtcclxuXHRcdE9iamVjdC5rZXlzKG1vZHVsZXMpLmZvckVhY2goIGZ1bmN0aW9uIChtb2R1bGVOYW1lKSB7XHJcblx0XHRcdHRyeSB7XHJcblx0XHRcdFx0bW9kdWxlc1ttb2R1bGVOYW1lXS51bm1vdW50KCk7XHJcblx0XHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdFx0Ly9jb25zb2xlLndhcm4oJ2ZhaWxlZCB0byB1bm1vdW50IG1vZHVsZTogJywgbW9kdWxlTmFtZSk7XHJcblx0XHRcdFx0Ly9jb25zb2xlLmVycm9yKGVycm9yKTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblx0fSxcclxuXHQncmVuZGVyQWxsJzogZnVuY3Rpb24gKCkge1xyXG5cdFx0T2JqZWN0LmtleXMobW9kdWxlcykuZm9yRWFjaCggZnVuY3Rpb24gKG1vZHVsZU5hbWUpIHtcclxuXHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRtb2R1bGVzW21vZHVsZU5hbWVdLnJlbmRlcigpO1xyXG5cdFx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRcdC8vY29uc29sZS53YXJuKCdmYWlsZWQgdG8gUmVuZGVyIG1vZHVsZTogJywgbW9kdWxlTmFtZSk7XHJcblx0XHRcdFx0Ly9jb25zb2xlLmVycm9yKGVycm9yKTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblx0fVxyXG59OyIsIihmdW5jdGlvbigpe1xyXG5cdCd1c2Ugc3RyaWN0JztcclxuXHRcclxuXHR2YXIgZWxlbWVudHMsXHJcblx0XHRtZXRob2RzLFxyXG5cdFx0YWNjZXNzaWJpbGl0eTtcclxuXHRcclxuXHRlbGVtZW50cyA9IHt9O1xyXG5cdG1ldGhvZHMgPSB7fTtcclxuXHRcclxuXHRtZXRob2RzLmh0bWxFbGVtZW50ID0ge1xyXG5cdFx0Z2V0QXR0cmlidXRlOiBmdW5jdGlvbihkYXRhKSB7XHJcblx0XHRcdGlmIChkYXRhLmVsZW1lbnQpIHtcclxuXHRcdFx0XHRyZXR1cm4gKGRhdGEuZWxlbWVudC5nZXRBdHRyaWJ1dGUoZGF0YS5hdHRyaWJ1dGVLZXkpIHx8IGZhbHNlKTtcclxuXHRcdFx0fVxyXG5cdFx0fSxcclxuXHRcdGhhc0F0dHJpYnV0ZVZhbHVlOiBmdW5jdGlvbihkYXRhLCBhdHRyaWJ1dGVWYWx1ZSkge1xyXG5cdFx0XHRpZiAoIWF0dHJpYnV0ZVZhbHVlKSB7XHJcblx0XHRcdFx0YXR0cmlidXRlVmFsdWUgPSBtZXRob2RzLmh0bWxFbGVtZW50LmdldEF0dHJpYnV0ZShkYXRhKTtcclxuXHRcdFx0fVxyXG5cdFx0XHR2YXIgcmVnZXggPSBuZXcgUmVnRXhwKGRhdGEuYXR0cmlidXRlVmFsdWUsICdnaScpO1xyXG5cdFx0XHRyZXR1cm4gcmVnZXgudGVzdChhdHRyaWJ1dGVWYWx1ZSk7XHJcblx0XHR9LFxyXG5cdFx0YWRkQXR0cmlidXRlVmFsdWU6IGZ1bmN0aW9uKGRhdGEpIHtcclxuXHRcdFx0dmFyIGF0dHJpYnV0ZVZhbHVlID0gbWV0aG9kcy5odG1sRWxlbWVudC5nZXRBdHRyaWJ1dGUoZGF0YSk7XHJcblx0XHRcdFxyXG5cdFx0XHRpZiAoIW1ldGhvZHMuaHRtbEVsZW1lbnQuaGFzQXR0cmlidXRlVmFsdWUoZGF0YSwgYXR0cmlidXRlVmFsdWUpKSB7XHJcblx0XHRcdFx0aWYgKGF0dHJpYnV0ZVZhbHVlKSB7XHJcblx0XHRcdFx0XHRhdHRyaWJ1dGVWYWx1ZSA9IGF0dHJpYnV0ZVZhbHVlICsgJyAnICsgZGF0YS5hdHRyaWJ1dGVWYWx1ZTtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0YXR0cmlidXRlVmFsdWUgPSBkYXRhLmF0dHJpYnV0ZVZhbHVlO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRkYXRhLmVsZW1lbnQuc2V0QXR0cmlidXRlKGRhdGEuYXR0cmlidXRlS2V5LCBhdHRyaWJ1dGVWYWx1ZSk7XHJcblx0XHRcdH1cclxuXHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHR9LFxyXG5cdFx0cmVtb3ZlQXR0cmlidXRlVmFsdWU6IGZ1bmN0aW9uKGRhdGEpIHtcclxuXHRcdFx0dmFyIGF0dHJpYnV0ZVZhbHVlID0gbWV0aG9kcy5odG1sRWxlbWVudC5nZXRBdHRyaWJ1dGUoZGF0YSk7XHJcblx0XHRcdHZhciBoYXNBdHRyaWJ1dGVWYWx1ZSA9IG1ldGhvZHMuaHRtbEVsZW1lbnQuaGFzQXR0cmlidXRlVmFsdWUoZGF0YSwgYXR0cmlidXRlVmFsdWUpO1xyXG5cdFx0XHR2YXIgdmFsdWVSZW1vdmVkID0gZmFsc2U7XHJcblx0XHRcdGlmIChoYXNBdHRyaWJ1dGVWYWx1ZSkge1xyXG5cdFx0XHRcdHZhciByZWdleCA9IG5ldyBSZWdFeHAoZGF0YS5hdHRyaWJ1dGVWYWx1ZSwgJ2dpJyk7XHJcblx0XHRcdFx0dmFyIG5ld0F0dHJpYnV0ZVZhbHVlID0gYXR0cmlidXRlVmFsdWUucmVwbGFjZShyZWdleCwgJycpLnRyaW0oKTtcclxuXHRcdFx0XHRpZiAobmV3QXR0cmlidXRlVmFsdWUpIHtcclxuXHRcdFx0XHRcdGRhdGEuZWxlbWVudC5zZXRBdHRyaWJ1dGUoZGF0YS5hdHRyaWJ1dGVLZXksIG5ld0F0dHJpYnV0ZVZhbHVlKTtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0ZGF0YS5lbGVtZW50LnJlbW92ZUF0dHJpYnV0ZShkYXRhLmF0dHJpYnV0ZUtleSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdHZhbHVlUmVtb3ZlZCA9IHRydWU7XHJcblx0XHRcdH1cclxuXHRcdFx0cmV0dXJuIHZhbHVlUmVtb3ZlZDtcclxuXHRcdH0sXHJcblx0XHR0b2dnbGVBdHRyaWJ1dGVWYWx1ZTogZnVuY3Rpb24oZGF0YSkge1xyXG5cdFx0XHRkYXRhLmF0dHJpYnV0ZVZhbHVlID0gZGF0YS5yZW1vdmVBdHRyaWJ1dGVWYWx1ZTtcclxuXHRcdFx0dmFyIHZhbHVlVG9nZ2xlZCA9IGZhbHNlO1xyXG5cdFx0XHR2YXIgcmVtb3ZlQXR0cmlidXRlVmFsdWUgPSBtZXRob2RzLmh0bWxFbGVtZW50LnJlbW92ZUF0dHJpYnV0ZVZhbHVlKGRhdGEpO1xyXG5cdFx0XHRcclxuXHRcdFx0aWYgKHJlbW92ZUF0dHJpYnV0ZVZhbHVlKSB7XHJcblx0XHRcdFx0ZGF0YS5hdHRyaWJ1dGVWYWx1ZSA9IGRhdGEuYWRkQXR0cmlidXRlVmFsdWU7XHJcblx0XHRcdFx0bWV0aG9kcy5odG1sRWxlbWVudC5hZGRBdHRyaWJ1dGVWYWx1ZShkYXRhKTtcclxuXHRcdFx0XHR2YWx1ZVRvZ2dsZWQgPSB0cnVlO1xyXG5cdFx0XHR9XHJcblx0XHRcdHJldHVybiB2YWx1ZVRvZ2dsZWQ7XHJcblx0XHR9XHJcblx0fTtcclxuXHRcclxuXHJcblx0bWV0aG9kcy5hY2Nlc3NpYmlsaXR5ID0ge1xyXG5cdFx0c2V0OiBmdW5jdGlvbihkYXRhKSB7XHJcblx0XHRcdG1ldGhvZHMuaHRtbEVsZW1lbnQudG9nZ2xlQXR0cmlidXRlVmFsdWUoZGF0YSk7XHJcblx0XHRcdG1ldGhvZHMuYWNjZXNzaWJpbGl0eS5zZXRMb2NhbFN0b3JlKGRhdGEuZWxlbWVudCk7XHJcblx0XHR9LFxyXG5cdFx0Z2V0RnJvbUVsZW1lbnQ6IGZ1bmN0aW9uKGRhdGEpIHtcclxuXHRcdFx0cmV0dXJuIG1ldGhvZHMuaHRtbEVsZW1lbnQuZ2V0QXR0cmlidXRlKGRhdGEpO1xyXG5cdFx0fSxcclxuXHRcdHNldExvY2FsU3RvcmU6IGZ1bmN0aW9uKGRhdGEpIHtcclxuXHRcdFx0cmV0dXJuIGFjY2Vzc2liaWxpdHkgPSBtZXRob2RzLmFjY2Vzc2liaWxpdHkuZ2V0RnJvbUVsZW1lbnQoZGF0YSk7XHJcblx0XHRcdFxyXG5cdFx0fSxcclxuXHRcdGdldExvY2FsU3RvcmU6IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRyZXR1cm4gYWNjZXNzaWJpbGl0eTtcclxuXHRcdH0sXHJcblx0XHRkYXRhTW91c2U6IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHR2YXIgZGF0YSA9IHtcclxuXHRcdFx0XHRlbGVtZW50OiBlbGVtZW50cy5ib2R5LFxyXG5cdFx0XHRcdGF0dHJpYnV0ZUtleTogJ2FjY2Vzc2liaWxpdHknLFxyXG5cdFx0XHRcdGFkZEF0dHJpYnV0ZVZhbHVlOiAnbW91c2UnLFxyXG5cdFx0XHRcdHJlbW92ZUF0dHJpYnV0ZVZhbHVlOiAna2V5Ym9hcmQnXHJcblx0XHRcdH07XHJcblx0XHRcdHJldHVybiBkYXRhO1xyXG5cdFx0fSxcclxuXHRcdGRhdGFLZXlib2FyZDogZnVuY3Rpb24oKSB7XHJcblx0XHRcdHZhciBkYXRhID0ge1xyXG5cdFx0XHRcdGVsZW1lbnQ6IGVsZW1lbnRzLmJvZHksXHJcblx0XHRcdFx0YXR0cmlidXRlS2V5OiAnYWNjZXNzaWJpbGl0eScsXHJcblx0XHRcdFx0YWRkQXR0cmlidXRlVmFsdWU6ICdrZXlib2FyZCcsXHJcblx0XHRcdFx0cmVtb3ZlQXR0cmlidXRlVmFsdWU6ICdtb3VzZSdcclxuXHRcdFx0fTtcclxuXHRcdFx0XHJcblx0XHRcdHJldHVybiBkYXRhO1xyXG5cdFx0fVxyXG5cdH07XHJcblx0XHJcblx0bWV0aG9kcy5ldmVudExpc3RlbmVyID0ge1xyXG5cdFx0bW91c2U6IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRhZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgbWV0aG9kcy5ldmVudExpc3RlbmVyLnNldEtleWJvYXJkKTtcclxuXHRcdFx0cmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgbWV0aG9kcy5ldmVudExpc3RlbmVyLnNldE1vdXNlKTtcclxuXHRcdH0sXHJcblx0XHRrZXlib2FyZDogZnVuY3Rpb24oKSB7XHJcblx0XHRcdGFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIG1ldGhvZHMuZXZlbnRMaXN0ZW5lci5zZXRNb3VzZSk7XHJcblx0XHRcdHJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIG1ldGhvZHMuZXZlbnRMaXN0ZW5lci5zZXRLZXlib2FyZCk7XHJcblx0XHR9LFxyXG5cdFx0c2V0TW91c2U6IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHR2YXIgZGF0YSA9IG1ldGhvZHMuYWNjZXNzaWJpbGl0eS5kYXRhTW91c2UoKTtcclxuXHRcdFx0bWV0aG9kcy5hY2Nlc3NpYmlsaXR5LnNldChkYXRhKTtcclxuXHRcdFx0bWV0aG9kcy5ldmVudExpc3RlbmVyLm1vdXNlKCk7XHJcblx0XHR9LFxyXG5cdFx0c2V0S2V5Ym9hcmQ6IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHR2YXIgZGF0YSA9IG1ldGhvZHMuYWNjZXNzaWJpbGl0eS5kYXRhS2V5Ym9hcmQoKTtcclxuXHRcdFx0bWV0aG9kcy5hY2Nlc3NpYmlsaXR5LnNldChkYXRhKTtcclxuXHRcdFx0bWV0aG9kcy5ldmVudExpc3RlbmVyLmtleWJvYXJkKCk7XHJcblx0XHR9XHJcblx0fTtcclxuXHRcclxuXHRtZXRob2RzLmluaXQgPSBmdW5jdGlvbigpIHtcclxuXHRcdGVsZW1lbnRzLmJvZHkgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdib2R5Jyk7XHJcblx0XHR2YXIgZGF0YSA9IHtcclxuXHRcdFx0ZWxlbWVudDogZWxlbWVudHMuYm9keSxcclxuXHRcdFx0YXR0cmlidXRlS2V5OiAnYWNjZXNzaWJpbGl0eSdcclxuXHRcdH07XHJcblx0XHRcclxuXHRcdGRhdGEuYWRkQXR0cmlidXRlVmFsdWUgPSBtZXRob2RzLmFjY2Vzc2liaWxpdHkuZ2V0RnJvbUVsZW1lbnQoZGF0YSk7XHJcblx0XHRcclxuXHRcdG1ldGhvZHMuYWNjZXNzaWJpbGl0eS5zZXRMb2NhbFN0b3JlKGRhdGEpO1xyXG5cdFx0XHJcblx0XHRpZiAobWV0aG9kcy5hY2Nlc3NpYmlsaXR5LmdldExvY2FsU3RvcmUoKSA9PT0gJ21vdXNlJykge1xyXG5cdFx0XHRtZXRob2RzLmV2ZW50TGlzdGVuZXIubW91c2UoKTtcclxuXHRcdH0gZWxzZSBpZiAobWV0aG9kcy5hY2Nlc3NpYmlsaXR5LmdldExvY2FsU3RvcmUoKSA9PT0gJ2tleWJvYXJkJykge1xyXG5cdFx0XHRtZXRob2RzLmV2ZW50TGlzdGVuZXIua2V5Ym9hcmQoKTtcclxuXHRcdH1cclxuXHR9O1xyXG5cclxuXHRtZXRob2RzLmluaXQoKTtcclxufSkoKTsiLCIoZnVuY3Rpb24oKSB7XHJcblx0bWV0aG9kcy5tb2R1bGVzLm1vdW50QWxsKCdib2R5Jyk7XHJcblx0bWV0aG9kcy5tb2R1bGVzLmluaXRBbGwoJ2JvZHknKTtcclxufSkoKTsiXX0=
