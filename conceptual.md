### Conceptual Exercise

Answer the following questions below:

 **1. What is a JWT?**

- A JWT is an internet standard for sending encoded information between two parties. It consists of 3 parts: a header, a payload and a signature.
- Put together, a JWT typically looks like: "xxxxxx.yyyyyyyy.zzzzzzzz" 
	- Header: contains 2 things encoded in base64: the type of the token (how the payload should be interpreted), and the name of encoding algorithm that makes the signarue (e.g. typ: 'JWT', alg: 'HS256')
	- Payload: contains a JSON object with data and claims being passed on, e.g. {"isAdmin": "true", "username": "user"}. This is also encoded into base64, so no confidential information should be passed on this way. 
	- Signature: this is a hash (as specified in the header) of the encoded header, the encoded payload and a secret key stored safely on the server side. Checking the JWT signature is used to verify that the message wasn't tampered with along the way, and it is often also used to verify the identity of the sender. The signature cannot be decoded. 

**2. What is the signature portion of the JWT?  What does it do?**

* see above



**3. If a JWT is intercepted, can the attacker see what's inside the payload?** 

* Yes. The payload is only encoded in base64 and as such can be decoded easily. No sensitive information should be passed via the payload. 



**4. How can you implement authentication with a JWT?  Describe how it works at a high level.**

* Upon registration, instead of making a session and setting a cookie, the server will send a JWT back. The token will then be passed back from the client side alongside every request. On the server side, the token's signature can be checked against the secret key to validate the token. This prevents unauthorized access and data tampering. If the JWT signature is valid, the payload data is retrieved and the server uses this data to create a response. 



**5. Compare and contrast unit, integration and end-to-end tests.** 

* Unit Test   

	* A unit is the smallest testable component of any software. It is performed prior to integration testing. It is performed independently from other parts and verifies whether the system under test produces correct results. 
* Integration Test
	* This type of testing verifies whether independent units of software interact with each others in the desired manner. 
* End-To-End Test
	* This type of testing verifies that the application's workflow from beginning to end acts as intended. It aims to replicate real user scenarios. The advantage of end to end tests is that more user-impacting bugs are likely to be found upfront, but on the downside the tests are not as maintainable as unit/integration tests and break easily when features change. Common E2E testing libraries include Cypress and Selenium. 

**6. What is a mock? What are some things you would mock?**

* Mocking is a practice most commonly used in unit-testing, when certain components might be dependent on other complex objects or random data. Mocking enables isolating the behaviour the unit, by simulating the actions of their external dependencies and standardizing them so that the unit test can go ahead repeatedly. For example, if a unit relies on input from an rate-limited API, it might be better to replace the API with a mock object to simulate its output. Or, if a unit triggers an email service, it might be better to replace the email-sending service with a mock object so that an email isn't sent each time the test is run. 

**7. What is continuous integration?**

* CI is a development practice which requires developers to integrate newly written code into a shared version control repository frequently. This code is then subjected to automated tests, which help to detect problems early. CI is considered a devops best practice. 

**8. What is an environment variable and what are they used for?**

* An environment variable is one whose value is set outside the program by the operating system, and typically determines the application's configuration. They are otherwise decoupled from the application's logic. It is made up on a key value pair, and any number of environmental variables can be created. In Node.js, process.env is a global variable which accepts environment variables, e.g. process.env.DATABASE_URI= 'database'. 

**9. What is TDD? What are some benefits and drawbacks?**

* TDD stands for test driven development and refers to the practice of writing tests before writing the rest of the code. The tests initially fail, and the aim of the code is to write it such that the tests pass. The benefit of TDD is that it prevents code duplication and bugs, increases confidence in refactoring, and makes the application easier to maintain if new features are introduced. The disadvantage is that it is a slow process. Its success is also dependent on whether the test coded is written correctly. Moreover, if requirements for the app change, then tests need to be rewritten too, which again takes time. 


**10.  What is the value of using JSONSchema for validation?**

Server-side validation of data is necessary, because incomplete or corrupt data can cause error down the line. It also makes it easier to display helpful error messages to the user, and prevents extra db operations. 

* there are 3 main reasons for using this tool: 
	* to make bad user input fail fast without bad data reaching db
	* 	to reduce amount of code for processing and validating data
	*  to get a validation system that is easy to setup and maintain

**11. What are some ways to decide which code to test?**

- What are some differences between Web Sockets and HTTP?

**12. Did you prefer using Flask over Express? Why or why not (there is no right 
  answer here --- we want to see how you think about technology)?**
