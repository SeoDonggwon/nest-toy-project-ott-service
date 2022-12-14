import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserRepository } from './user.repository';
import { AuthCredentialsDto } from './dto/auth-credential.dto';
import { User } from './user.entity';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: UserRepository,
    private jwtServices: JwtService,
  ) {}

  // 4:20:30
  async signUp(authCredentialsDto: AuthCredentialsDto): Promise<void> {
    // 회원 가입 기능
    const { username, password } = authCredentialsDto;

    const salt = await bcrypt.genSalt(); // bcrpyt 모듈을 이용하여 비밀번호 암호화
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = this.userRepository.create({
      username,
      password: hashedPassword,
    });

    try {
      await this.userRepository.save(user);
    } catch (error) {
      if (error.code === `23505`) {
        // 사용자 이름이 중복일 시 예외 생성
        throw new ConflictException(`Existing username`);
      } else {
        throw new InternalServerErrorException();
      }
    }
  }

  async signIn(
    authCredentialsDto: AuthCredentialsDto,
  ): Promise<{ accessToken: string }> {
    // 로그인 기능
    const { username, password } = authCredentialsDto;
    const user = await this.userRepository.findOne({
      where: { username: username }, // 변경된 문법
    });

    if (user && (await bcrypt.compare(password, user.password))) {
      // 유저 토큰 생성을 해줘야 함, 필요한 것은 (Secret + Payload)이 필요함
      // payload 객체에는 user의 이름, 권한, 이메일 등을 넣고, 중요한 정보는 넣으면 안됨
      const payload = { username };
      const accessToken = this.jwtServices.sign(payload);

      return { accessToken };
    } else {
      // DB 해당하는 user가 없거나, 비밀번호가 일치하지 않을 시 로그인 실패
      throw new UnauthorizedException('login failed');
    }
  }
}
