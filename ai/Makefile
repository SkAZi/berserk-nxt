main:
	cp data/model.txt model.txt.0 && printf "\0" >> model.txt.0
	GOOS=darwin GOARCH=arm64 go build -o dist/server.mac.arm64
	codesign --deep --force --verify --verbose --sign "Developer ID Application: Igor Potapov (2AC4L7R5YG)" ./dist/server.mac.arm64
	GOOS=darwin GOARCH=amd64 go build -o dist/server.mac.x64
	codesign --deep --force --verify --verbose --sign "Developer ID Application: Igor Potapov (2AC4L7R5YG)" ./dist/server.mac.x64
	GOOS=linux GOARCH=amd64 go build -o dist/server.linux.x64
	GOOS=windows GOARCH=amd64 go build -o dist/server.win.x64
	rm model.txt.0
