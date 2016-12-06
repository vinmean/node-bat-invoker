var should = require('should');
var supertest = require('supertest');

var server = supertest.agent('http://localhost:3000');

describe('File upload test cases',function(){
	it('should upload file',function(done){
	this.timeout(120000);
		server
		.post('/code')
		.field('codeZipFile', 'code.zip')
		.attach('file', 'code.zip')
		.expect(200)
		.end(function(err,res){
			res.status.should.equal(200)
			done();
		});
	});
});
