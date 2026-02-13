package com.codeclimb.backend.service;

import com.codeclimb.backend.dto.AuthDtos;
import com.codeclimb.backend.entity.UserEntity;
import com.codeclimb.backend.repository.UserRepository;
import com.codeclimb.backend.security.JwtService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    public AuthDtos.AuthResponse signup(AuthDtos.SignupRequest request) {
        if (userRepository.findByEmail(request.email()).isPresent()) {
            throw new BadRequestException("Email already exists");
        }
        UserEntity user = new UserEntity();
        user.setEmail(request.email().toLowerCase());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setTimezone(request.timezone() == null || request.timezone().isBlank() ? "America/Chicago" : request.timezone());
        UserEntity saved = userRepository.save(user);
        String token = jwtService.generateToken(saved.getId(), saved.getEmail());
        return new AuthDtos.AuthResponse(token, jwtService.getExpirationSeconds(), saved.getId(), saved.getEmail(), saved.getTimezone());
    }

    public AuthDtos.AuthResponse login(AuthDtos.LoginRequest request) {
        UserEntity user = userRepository.findByEmail(request.email().toLowerCase())
                .orElseThrow(() -> new BadRequestException("Invalid credentials"));
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new BadRequestException("Invalid credentials");
        }
        String token = jwtService.generateToken(user.getId(), user.getEmail());
        return new AuthDtos.AuthResponse(token, jwtService.getExpirationSeconds(), user.getId(), user.getEmail(), user.getTimezone());
    }
}
