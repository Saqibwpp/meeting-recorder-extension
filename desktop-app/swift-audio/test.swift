import Foundation
import AVFoundation

let path = "test.m4a"
let url = URL(fileURLWithPath: path)
let writer = try! AVAssetWriter(outputURL: url, fileType: .m4a)
print("writer created")
