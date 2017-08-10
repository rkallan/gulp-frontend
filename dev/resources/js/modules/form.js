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