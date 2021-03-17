const request = require('supertest');
const server = require('index');

describe('Auth API local register 테스트', () => {
    test('중복되는 아이디로 가입 시 409응답코드와 {key:username}객체 응답', async () => {
        const response = await request(server)
        .post('/api/auth/register/local')
        .send({
            username: 'googleUser',
            email: 'hhsw1606@asdf.com',
            password: '123123'
        });
        expect(response.status).toEqual(409);
        expect(response.body).toEqual({
            key: 'username'
        });
    });
});